import { barsOf, type Pattern } from '../../domain/strumming'
import type { Clock } from '../clock'
import {
  MetronomeEngine,
  type Beat,
  type BeatListener,
  type MetronomeConfig,
  type Position,
  type VisibilitySource,
} from '../metronome/metronome'
import type { MetronomeSettings } from '../../domain/metronomeSettings'
import { DEFAULT_STRUMMING_SETTINGS, SOUND_CHOICES, type SoundChoice } from '../../domain/strummingSettings'
import type { SoundKind, SoundScheduler } from '../sounds'
import type { Ticker } from '../ticker'
import { expandBeat, slotAt, type ExpectedStroke } from './slotTiming'

/** How long strokes that have sounded are kept for later comparison with detected strums. */
export const STROKE_RETENTION_SEC = 5

/** Guide sounds are only scheduled this far ahead of now when the guide is turned on. */
const GUIDE_MARGIN_SEC = 0.01

export type StrummingState = {
  playing: boolean
  pattern: Pattern
  /** What sounds after the count-in; the count-in always clicks. */
  sound: SoundChoice
}

/** Where playback is at a given moment. */
export type StrummingPosition = {
  /** The metronome beat that is sounding. */
  beat: Position
  /** True during the count-in bar; the slot fields are then undefined. */
  countIn: boolean
  pattern?: Pattern
  /** Slot within the bar. */
  slot?: number
  /** Bar within the pattern, counting from 0. */
  barInPattern?: number
}

/** The pattern a bar of the run plays, fixed when the bar's first beat is scheduled. */
type BarPlan = { pattern: Pattern; barInPattern: number; firstBeatTime: number }

type Deps = {
  clock: Clock
  /** Metronome clicks. */
  sounds: SoundScheduler
  /** Guide sounds; separate so they can be cancelled without touching the clicks. */
  guide: SoundScheduler
  ticker: Ticker
  pattern: Pattern
  /** Tempo and speed trainer (default 80 BPM, trainer off); the beats per bar comes from the pattern. */
  tempo?: Omit<MetronomeSettings, 'beatsPerBar'>
  sound?: SoundChoice
  visibility?: VisibilitySource
  config?: MetronomeConfig
}

/**
 * Plays a strumming pattern over its own metronome. Bar 0 of each run is the
 * count-in; the pattern starts at bar 1. Every slot's time comes from
 * `expandBeat`, so the guide, the cursor and the expected stroke timeline
 * agree. Tempo and speed trainer commands go to `metronome` directly.
 */
export class StrummingEngine {
  readonly metronome: MetronomeEngine
  private state: StrummingState
  private readonly listeners = new Set<() => void>()
  private readonly clock: Clock
  private readonly guide: SoundScheduler
  private bars = new Map<number, BarPlan>()
  /** Every scheduled slot, misses included, oldest first. */
  private strokes: ExpectedStroke[] = []
  private lastPosition: { raw: Beat; position: StrummingPosition } | undefined

  constructor(deps: Deps) {
    this.clock = deps.clock
    this.guide = deps.guide
    this.state = { playing: false, pattern: deps.pattern, sound: deps.sound ?? DEFAULT_STRUMMING_SETTINGS.sound }
    const listener: BeatListener = {
      beatScheduled: this.beatScheduled,
      rewound: this.rewound,
      muteClick: (beat) => beat.bar > 0 && this.state.sound === 'guide',
    }
    this.metronome = new MetronomeEngine({
      clock: deps.clock,
      sounds: deps.sounds,
      ticker: deps.ticker,
      visibility: deps.visibility,
      config: deps.config,
      settings: { ...(deps.tempo ?? defaultTempo()), beatsPerBar: deps.pattern.beatsPerBar },
      listener,
    })
    this.metronome.subscribe(this.onMetronome)
  }

  getState = (): StrummingState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  now(): number {
    return this.clock.now()
  }

  /** Start with a count-in bar. Call from a user gesture handler so audio can start. */
  async start(): Promise<void> {
    await this.metronome.start()
  }

  /** Stop; nothing scheduled plays. */
  stop(): void {
    this.metronome.stop()
    this.guide.cancelAll()
  }

  toggle(): void {
    if (this.state.playing) this.stop()
    else void this.start()
  }

  /**
   * Select a pattern. While playing, the bar under way finishes as it was and
   * the new pattern starts from its first bar at the next bar.
   */
  setPattern(pattern: Pattern): void {
    if (pattern === this.state.pattern) return
    this.setState({ ...this.state, pattern })
    this.metronome.setBeatsPerBar(pattern.beatsPerBar)
    this.metronome.rescheduleUpcoming()
  }

  /**
   * Choose what sounds after the count-in. While playing, the guide changes
   * from now and the click from the next beat that has not sounded.
   */
  setSound(sound: SoundChoice): void {
    if (sound === this.state.sound) return
    this.setState({ ...this.state, sound })
    if (!this.state.playing) return
    const now = this.clock.now()
    this.guide.cancelFrom(now)
    if (this.guideOn()) {
      for (const s of this.strokes) if (s.time > now + GUIDE_MARGIN_SEC) this.playGuide(s)
    }
    // Queued beats are scheduled again with or without their click; the
    // guide from the next beat is rewound and replayed with them.
    this.metronome.rescheduleUpcoming()
  }

  /** Both → Guide → Click → Both. */
  cycleSound(): void {
    const i = SOUND_CHOICES.indexOf(this.state.sound)
    this.setSound(SOUND_CHOICES[(i + 1) % SOUND_CHOICES.length])
  }

  /** Scheduled strokes that are not misses, from the last few seconds onwards. */
  expectedStrokes(): ExpectedStroke[] {
    return this.strokes.filter((s) => s.stroke !== 'miss')
  }

  /**
   * Where playback is at audio-clock time `now`, or undefined before the first
   * click and when stopped. Returns the same object for as long as the beat
   * and slot are unchanged, so a per-frame reader only re-renders on a change.
   */
  position(now: number): StrummingPosition | undefined {
    const raw = this.metronome.beatAt(now)
    const beat = raw && this.metronome.position(now)
    if (!raw || !beat) return (this.lastPosition = undefined)
    const plan = beat.bar === 0 ? undefined : this.bars.get(beat.bar)
    const slot = plan && slotAt(raw, plan.pattern, now)
    const last = this.lastPosition
    if (last && last.raw === raw && last.position.slot === slot) return last.position
    const position: StrummingPosition = {
      beat,
      countIn: beat.bar === 0,
      pattern: plan?.pattern,
      slot,
      barInPattern: plan?.barInPattern,
    }
    this.lastPosition = { raw, position }
    return position
  }

  /** Stop timers; for unmounting. */
  dispose(): void {
    this.stop()
    this.listeners.clear()
  }

  private beatScheduled = (beat: Beat) => {
    if (beat.bar === 0) {
      if (beat.beatInBar === 0) this.reset()
      return
    }
    if (beat.beatInBar === 0) this.planBar(beat)
    const plan = this.bars.get(beat.bar)
    if (!plan || beat.beatInBar >= plan.pattern.beatsPerBar) return
    const strokes = expandBeat(beat, plan.pattern, plan.barInPattern)
    this.strokes.push(...strokes)
    if (this.guideOn()) for (const s of strokes) this.playGuide(s)
    this.prune()
  }

  private rewound = (fromTime: number) => {
    this.guide.cancelFrom(fromTime)
    this.strokes = this.strokes.filter((s) => s.time < fromTime)
    for (const [bar, plan] of this.bars) if (plan.firstBeatTime >= fromTime) this.bars.delete(bar)
  }

  /** Fix the pattern for the bar starting at `beat`: continue the previous bar's pattern, or start the selected one. */
  private planBar(beat: Beat) {
    const { pattern } = this.state
    const prev = this.bars.get(beat.bar - 1)
    const barInPattern = prev && prev.pattern === pattern ? (prev.barInPattern + 1) % barsOf(pattern) : 0
    this.bars.set(beat.bar, { pattern, barInPattern, firstBeatTime: beat.time })
  }

  private guideOn(): boolean {
    return this.state.sound !== 'click'
  }

  private playGuide(s: ExpectedStroke) {
    const kind = guideSound(s)
    if (kind) this.guide.schedule(kind, s.time)
  }

  private reset() {
    this.bars.clear()
    this.strokes = []
  }

  private prune() {
    const cutoff = this.clock.now() - STROKE_RETENTION_SEC
    let drop = 0
    while (drop < this.strokes.length && this.strokes[drop].time < cutoff) drop++
    if (drop > 0) this.strokes.splice(0, drop)
    const current = this.metronome.beatAt(this.clock.now())?.bar ?? 0
    for (const bar of this.bars.keys()) if (bar < current - 1) this.bars.delete(bar)
  }

  private onMetronome = () => {
    const playing = this.metronome.getState().playing
    if (playing !== this.state.playing) this.setState({ ...this.state, playing })
  }

  private setState(next: StrummingState) {
    this.state = next
    for (const listener of this.listeners) listener()
  }
}

function defaultTempo(): Omit<MetronomeSettings, 'beatsPerBar'> {
  const { bpm, trainerOn, trainer } = DEFAULT_STRUMMING_SETTINGS
  return { bpm, trainerOn, trainer }
}

function guideSound({ stroke, direction }: ExpectedStroke): SoundKind | undefined {
  switch (stroke) {
    case 'hit':
      return direction === 'down' ? 'strumDown' : 'strumUp'
    case 'accent':
      return direction === 'down' ? 'strumDownAccent' : 'strumUpAccent'
    case 'chuck':
      return 'chuck'
    case 'miss':
      return undefined
  }
}
