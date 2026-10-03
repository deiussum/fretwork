import {
  DEFAULT_METRONOME_SETTINGS,
  MAX_BEATS_PER_BAR,
  MIN_BEATS_PER_BAR,
  type MetronomeSettings,
  type TrainerSettings,
} from '../../domain/metronomeSettings'
import type { Clock } from '../clock'
import type { SoundScheduler } from '../sounds'
import type { Ticker } from '../ticker'
import { barsUntilNextStep, clampBpm, isValidTrainer, shiftRamp, tempoForBar } from './ramp'

export type MetronomeConfig = {
  /** How often the scheduler tops up. */
  tickMs: number
  /** How far ahead clicks are scheduled while the page is visible. */
  lookaheadSec: number
  /** How far ahead clicks are scheduled while the page is hidden, to survive timer throttling. */
  hiddenLookaheadSec: number
  /** Delay between start and the first click, so it can be scheduled cleanly. */
  leadSec: number
}

export const DEFAULT_METRONOME_CONFIG: MetronomeConfig = {
  tickMs: 25,
  lookaheadSec: 0.1,
  hiddenLookaheadSec: 1.5,
  leadSec: 0.05,
}

/** Whether the page is hidden; the scheduler looks further ahead while it is. */
export interface VisibilitySource {
  hidden(): boolean
  onChange(listener: () => void): () => void
}

export type MetronomeState = {
  playing: boolean
  settings: MetronomeSettings
}

/** A scheduled click. */
export type Beat = {
  /** Audio-clock time of the click. */
  time: number
  /** Bar of the run, counting from 0. */
  bar: number
  /** Position in the bar, counting from 0. */
  beatInBar: number
  beatsPerBar: number
  /** Tempo of this beat; the interval to the next beat is 60 / bpm. */
  bpm: number
}

/** Where a playing metronome is at a given moment. */
export type Position = Beat & {
  /** Bars until the next speed trainer step; undefined when the trainer is off or at its target. */
  nextStepIn?: number
  /** The speed trainer has reached its target tempo. */
  atTarget: boolean
}

/**
 * Follows what the metronome schedules, so another engine can schedule its
 * own sounds on each beat.
 */
export interface BeatListener {
  /** Called after each beat is scheduled, in order. */
  beatScheduled(beat: Beat): void
  /**
   * Called when every scheduled beat from `fromTime` on is discarded: before a
   * live change schedules them again, and on stop (with the current time).
   */
  rewound(fromTime: number): void
  /** Asked before each beat's click is scheduled; true schedules the beat without a click. */
  muteClick?(beat: Beat): boolean
}

type Run = {
  nextBeatTime: number
  bar: number
  beatInBar: number
  /** Beats in the bar currently being scheduled, fixed at its first beat. */
  barBeats: number
  /** The latest beat that has sounded (if any) and every beat scheduled after it. */
  beats: Beat[]
}

type Deps = {
  clock: Clock
  sounds: SoundScheduler
  ticker: Ticker
  settings?: MetronomeSettings
  visibility?: VisibilitySource
  config?: MetronomeConfig
  listener?: BeatListener
}

/**
 * A metronome with an optional speed trainer. Clicks are scheduled a short
 * way ahead on the audio clock; the ticker only decides when to top up.
 * Framework-free: UI reads it via `getState`/`subscribe`/`position` and sends commands.
 */
export class MetronomeEngine {
  private state: MetronomeState
  private readonly listeners = new Set<() => void>()
  private readonly clock: Clock
  private readonly sounds: SoundScheduler
  private readonly ticker: Ticker
  private readonly visibility: VisibilitySource | undefined
  private readonly listener: BeatListener | undefined
  readonly config: MetronomeConfig
  private run: Run | undefined
  /** Incremented to invalidate a start that is still resuming audio. */
  private generation = 0
  private offVisibility: (() => void) | undefined

  constructor(deps: Deps) {
    this.clock = deps.clock
    this.sounds = deps.sounds
    this.ticker = deps.ticker
    this.visibility = deps.visibility
    this.listener = deps.listener
    this.config = deps.config ?? DEFAULT_METRONOME_CONFIG
    this.state = { playing: false, settings: deps.settings ?? DEFAULT_METRONOME_SETTINGS }
  }

  getState = (): MetronomeState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  now(): number {
    return this.clock.now()
  }

  /** True when the current settings allow starting. */
  canStart(): boolean {
    const { trainerOn, trainer } = this.state.settings
    return !trainerOn || isValidTrainer(trainer)
  }

  /** Start clicking. Call from a user gesture handler so audio can start. */
  async start(): Promise<void> {
    if (this.state.playing || !this.canStart()) return
    const generation = ++this.generation
    await this.sounds.resume()
    if (generation !== this.generation || this.state.playing) return

    this.run = {
      nextBeatTime: this.clock.now() + this.config.leadSec,
      bar: 0,
      beatInBar: 0,
      barBeats: this.state.settings.beatsPerBar,
      beats: [],
    }
    this.setState({ ...this.state, playing: true })
    this.schedule()
    this.ticker.start(this.config.tickMs, this.schedule)
    // Top up straight away when hidden, before throttled timers fall behind.
    this.offVisibility = this.visibility?.onChange(this.schedule)
  }

  /** Stop clicking; nothing scheduled plays. */
  stop(): void {
    this.generation++
    if (!this.state.playing) return
    this.ticker.stop()
    this.offVisibility?.()
    this.offVisibility = undefined
    this.sounds.cancelAll()
    this.listener?.rewound(this.clock.now())
    this.run = undefined
    this.setState({ ...this.state, playing: false })
  }

  toggle(): void {
    if (this.state.playing) this.stop()
    else void this.start()
  }

  /**
   * The tempo shown to the player: the current bar's tempo while playing,
   * otherwise the set tempo, or the trainer's start tempo when it is on.
   */
  currentTempo(): number {
    const { settings } = this.state
    const beat = this.run && this.beatAt(this.clock.now())
    if (beat) return this.tempoOfBar(beat.bar)
    return settings.trainerOn ? settings.trainer.start : settings.bpm
  }

  /**
   * Change the tempo. With the speed trainer on, the whole ramp shifts by the
   * difference from the tempo currently shown.
   */
  setTempo(bpm: number): void {
    const { settings } = this.state
    if (settings.trainerOn) {
      const { trainer, applied } = shiftRamp(settings.trainer, clampBpm(bpm) - this.currentTempo())
      if (applied !== 0) this.updateSettings({ trainer }, true)
    } else {
      const next = clampBpm(bpm)
      if (next !== settings.bpm) this.updateSettings({ bpm: next }, true)
    }
  }

  nudgeTempo(delta: number): void {
    this.setTempo(this.currentTempo() + delta)
  }

  /** Beats per bar, from 1 to 12; while playing it applies from the next bar. */
  setBeatsPerBar(beats: number): void {
    const next = Math.min(MAX_BEATS_PER_BAR, Math.max(MIN_BEATS_PER_BAR, Math.round(beats)))
    if (next !== this.state.settings.beatsPerBar) this.updateSettings({ beatsPerBar: next }, true)
  }

  /** Turn the speed trainer on or off; ignored while playing. */
  setTrainerOn(on: boolean): void {
    if (this.state.playing || on === this.state.settings.trainerOn) return
    this.updateSettings({ trainerOn: on }, false)
  }

  /** Replace the trainer settings, valid or not; ignored while playing. */
  setTrainer(trainer: TrainerSettings): void {
    if (this.state.playing) return
    this.updateSettings({ trainer }, false)
  }

  /**
   * Discard the beats that have not sounded and schedule them again under the
   * current settings, so a listener can reschedule its own sounds for them.
   */
  rescheduleUpcoming(): void {
    if (this.state.playing) this.reschedule()
  }

  /** Where the metronome is at audio-clock time `now`, or undefined before the first click. */
  position(now: number): Position | undefined {
    const beat = this.run && this.beatAt(now)
    if (!beat) return undefined
    const { trainerOn, trainer } = this.state.settings
    if (!trainerOn) return { ...beat, atTarget: false }
    const nextStepIn = barsUntilNextStep(beat.bar, trainer)
    return { ...beat, nextStepIn, atTarget: nextStepIn === undefined }
  }

  /** Stop timers; for unmounting. */
  dispose(): void {
    this.stop()
    this.listeners.clear()
  }

  private tempoOfBar(bar: number): number {
    const { trainerOn, trainer, bpm } = this.state.settings
    return trainerOn ? tempoForBar(bar, trainer) : bpm
  }

  /**
   * The latest beat that has sounded by `now`, or undefined when stopped or
   * before the first click. Returns the same object for as long as that beat
   * is current.
   */
  beatAt(now: number): Beat | undefined {
    const beats = this.run?.beats ?? []
    for (let i = beats.length - 1; i >= 0; i--) {
      if (beats[i].time <= now) return beats[i]
    }
    return undefined
  }

  private schedule = () => {
    const run = this.run
    if (!run) return
    const now = this.clock.now()
    const hidden = this.visibility?.hidden() ?? false
    const horizon = now + (hidden ? this.config.hiddenLookaheadSec : this.config.lookaheadSec)
    while (run.nextBeatTime < horizon) {
      if (run.beatInBar === 0) run.barBeats = this.state.settings.beatsPerBar
      const beat: Beat = {
        time: run.nextBeatTime,
        bar: run.bar,
        beatInBar: run.beatInBar,
        beatsPerBar: run.barBeats,
        bpm: this.tempoOfBar(run.bar),
      }
      if (!this.listener?.muteClick?.(beat)) {
        this.sounds.schedule(beat.beatInBar === 0 && beat.beatsPerBar > 1 ? 'accent' : 'tick', beat.time)
      }
      run.beats.push(beat)
      this.listener?.beatScheduled(beat)
      run.nextBeatTime += 60 / beat.bpm
      run.beatInBar++
      if (run.beatInBar >= run.barBeats) {
        run.beatInBar = 0
        run.bar++
      }
    }
    // Keep the latest sounded beat and everything after it.
    while (run.beats.length > 1 && run.beats[1].time <= now) run.beats.shift()
  }

  /**
   * Cancel scheduled beats that have not sounded yet and schedule them again
   * from the same point under the current settings. The next beat keeps its
   * time; the settings apply to it and the intervals after it.
   */
  private reschedule() {
    const run = this.run
    if (!run) return
    const now = this.clock.now()
    const first = run.beats.findIndex((b) => b.time > now)
    if (first !== -1) {
      const next = run.beats[first]
      this.sounds.cancelFrom(next.time)
      this.listener?.rewound(next.time)
      run.beats.length = first
      run.nextBeatTime = next.time
      run.bar = next.bar
      run.beatInBar = next.beatInBar
      // A bar already under way keeps its length.
      if (next.beatInBar !== 0) run.barBeats = next.beatsPerBar
    }
    this.schedule()
  }

  private updateSettings(patch: Partial<MetronomeSettings>, live: boolean) {
    this.setState({ ...this.state, settings: { ...this.state.settings, ...patch } })
    if (live && this.state.playing) this.reschedule()
  }

  private setState(next: MetronomeState) {
    this.state = next
    for (const listener of this.listeners) listener()
  }
}
