import { pairKey, type ChordPair } from '../domain/chords'
import { pairStats, type CountMethod, type HistoryRepository } from '../domain/history'
import type { Clock } from './clock'
import type { OnsetSource } from './input/onsetSource'
import type { SessionRecorder } from './recording/recorder'
import type { SoundScheduler } from './sounds'

export type SessionConfig = {
  countInBeats: number
  beatSec: number
  runSec: number
  /** Delay between pressing start and the first click, so it can be scheduled cleanly. */
  leadSec: number
  /** How often state transitions are checked against the clock. */
  pollMs: number
  /** Strums this soon after "go" are ignored (speaker bleed of the "go" sound). */
  gateSec: number
  /** In Mic mode, wait this long after the end before confirming, so late detections land. */
  graceSec: number
}

export const DEFAULT_CONFIG: SessionConfig = {
  countInBeats: 4,
  beatSec: 1,
  runSec: 60,
  leadSec: 0.15,
  pollMs: 50,
  gateSec: 0.15,
  graceSec: 0.2,
}

export const MAX_SCORE = 999

export type SessionState =
  | { kind: 'idle' }
  | { kind: 'countIn'; pair: ChordPair; firstBeatTime: number; goTime: number; endTime: number; count?: number }
  | {
      kind: 'running'
      pair: ChordPair
      goTime: number
      endTime: number
      /** Strums counted so far; only in Mic mode. */
      count?: number
    }
  | {
      kind: 'confirming'
      pair: ChordPair
      suggestedScore?: number
      error?: string
      /** Present when strums were detected automatically. */
      detection?: Detection
      /** The audio input stopped during the run. */
      inputLost?: boolean
      /** A recording of this session is available for export. */
      recorded?: boolean
    }
  | {
      kind: 'result'
      pair: ChordPair
      score: number
      /** Scores for the pair from before this attempt. */
      previous?: number
      best?: number
      isNewBest: boolean
      recorded?: boolean
    }

export type Detection = {
  count: number
  /** Seconds after "go", to the millisecond. */
  onsets: number[]
}

export type StartOptions = {
  /** Count strums from this source (Mic mode). */
  onsets?: OnsetSource
  /** Record the session's input from the first click to the end. */
  recorder?: SessionRecorder
}

type Deps = {
  clock: Clock
  sounds: SoundScheduler
  history: HistoryRepository
  config?: SessionConfig
  newId?: () => string
  timestamp?: () => string
}

/**
 * Owns the "1 minute changes" session lifecycle and all its timing.
 * Framework-free: UI reads it via `getState`/`subscribe` and sends commands.
 */
export class SessionEngine {
  private state: SessionState = { kind: 'idle' }
  private readonly listeners = new Set<() => void>()
  private readonly clock: Clock
  private readonly sounds: SoundScheduler
  private readonly history: HistoryRepository
  readonly config: SessionConfig
  private readonly newId: () => string
  private readonly timestamp: () => string
  private poll: ReturnType<typeof setInterval> | undefined
  /** Incremented to invalidate in-flight async work (start/submit). */
  private generation = 0
  private busy = false
  /** Mic mode bookkeeping for the current session. */
  private recorder: SessionRecorder | undefined
  private detection:
    | { onsets: number[]; lost: boolean; unsubscribe: () => void }
    | undefined

  constructor(deps: Deps) {
    this.clock = deps.clock
    this.sounds = deps.sounds
    this.history = deps.history
    this.config = deps.config ?? DEFAULT_CONFIG
    this.newId = deps.newId ?? (() => crypto.randomUUID())
    this.timestamp = deps.timestamp ?? (() => new Date().toISOString())
  }

  getState = (): SessionState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Current audio-clock time, for rendering countdowns. */
  now(): number {
    return this.clock.now()
  }

  /**
   * Begin a count-in. Call directly from a user gesture handler so audio can
   * start. Ignored unless idle or showing a result.
   */
  async start(pair: ChordPair, options: StartOptions = {}): Promise<void> {
    const { kind } = this.state
    if (this.busy || (kind !== 'idle' && kind !== 'result')) return
    this.busy = true
    const generation = ++this.generation
    try {
      await this.sounds.resume()
    } finally {
      this.busy = false
    }
    if (generation !== this.generation) return

    const { countInBeats, beatSec, runSec, leadSec } = this.config
    const firstBeatTime = this.clock.now() + leadSec
    const goTime = firstBeatTime + countInBeats * beatSec
    const endTime = goTime + runSec
    for (let beat = 0; beat < countInBeats; beat++) {
      this.sounds.schedule('click', firstBeatTime + beat * beatSec)
    }
    this.sounds.schedule('go', goTime)
    this.sounds.schedule('end', endTime)

    if (options.onsets) this.listen(options.onsets, goTime, endTime)
    // A new session replaces any previous recording, even when not recording.
    this.recorder?.discard()
    this.recorder = options.recorder
    this.recorder?.begin(firstBeatTime, endTime)
    const count = options.onsets ? { count: 0 } : {}
    this.setState({ kind: 'countIn', pair, firstBeatTime, goTime, endTime, ...count })
    this.startPolling()
    void this.history.saveLastPair(pair)
  }

  /** Stop a count-in or run; nothing is recorded. */
  abort(): void {
    if (this.busy) {
      this.generation++
      this.busy = false
    }
    const { kind } = this.state
    if (kind !== 'countIn' && kind !== 'running') return
    this.stopPolling()
    this.stopListening()
    this.recorder?.discard()
    this.recorder = undefined
    this.sounds.cancelAll()
    this.setState({ kind: 'idle' })
  }

  /** Validate and save the confirmed score, then show the result. */
  async submitScore(input: string | number): Promise<void> {
    const state = this.state
    if (state.kind !== 'confirming' || this.busy) return

    const score = parseScore(input)
    if (score === undefined) {
      this.setState({ ...state, error: `Enter a whole number from 0 to ${MAX_SCORE}.` })
      return
    }

    this.busy = true
    const generation = ++this.generation
    try {
      const key = pairKey(...state.pair)
      const before = pairStats(await this.history.loadResults(), key)
      await this.history.addResult({
        id: this.newId(),
        pairKey: key,
        chords: [state.pair[0], state.pair[1]],
        score,
        durationSec: this.config.runSec,
        at: this.timestamp(),
        ...detectionFields(state.detection),
      })
      if (generation !== this.generation) return
      this.setState({
        kind: 'result',
        pair: state.pair,
        score,
        previous: before.previous,
        best: before.best,
        isNewBest: before.best === undefined || score > before.best,
        ...(state.recorded ? { recorded: true } : {}),
      })
    } finally {
      this.busy = false
    }
  }

  /** Leave confirming (without saving) or result, back to setup. */
  back(): void {
    const { kind } = this.state
    if (kind !== 'confirming' && kind !== 'result') return
    this.generation++
    this.busy = false
    this.setState({ kind: 'idle' })
  }

  /** Stop timers; for unmounting. */
  dispose(): void {
    this.stopPolling()
    this.stopListening()
    this.sounds.cancelAll()
    this.listeners.clear()
  }

  /**
   * Hook for automatic counting: supply a suggested score while confirming.
   * Not used by manual counting.
   */
  suggestScore(score: number): void {
    if (this.state.kind !== 'confirming') return
    this.setState({ ...this.state, suggestedScore: score })
  }

  private tick = () => {
    const state = this.state
    const t = this.clock.now()
    if (state.kind === 'countIn' && t >= state.goTime) {
      const { pair, goTime, endTime, count } = state
      this.setState({ kind: 'running', pair, goTime, endTime, ...(count === undefined ? {} : { count }) })
    }
    const next = this.state
    const grace = this.detection ? this.config.graceSec : 0
    if (next.kind === 'running' && t >= next.endTime + grace) {
      this.stopPolling()
      this.recorder?.end()
      const confirming = this.confirmingState(next.pair, next.goTime)
      this.setState(this.recorder ? { ...confirming, recorded: true } : confirming)
      this.stopListening()
    }
  }

  private confirmingState(pair: ChordPair, goTime: number): Extract<SessionState, { kind: 'confirming' }> {
    const detection = this.detection
    if (!detection) return { kind: 'confirming', pair }
    if (detection.lost) return { kind: 'confirming', pair, inputLost: true }
    const onsets = detection.onsets.map((t) => Math.round((t - goTime) * 1000) / 1000)
    return {
      kind: 'confirming',
      pair,
      suggestedScore: onsets.length,
      detection: { count: onsets.length, onsets },
    }
  }

  private listen(source: OnsetSource, goTime: number, endTime: number) {
    this.stopListening()
    const detection = { onsets: [] as number[], lost: source.status === 'lost', unsubscribe: () => {} }
    const offOnset = source.subscribe((time) => {
      if (time < goTime + this.config.gateSec || time >= endTime) return
      detection.onsets.push(time)
      const state = this.state
      if (state.kind === 'countIn' || state.kind === 'running') {
        this.setState({ ...state, count: detection.onsets.length })
      }
    })
    const offStatus = source.onStatus((status) => {
      if (status === 'lost') detection.lost = true
    })
    detection.unsubscribe = () => {
      offOnset()
      offStatus()
    }
    this.detection = detection
  }

  private stopListening() {
    this.detection?.unsubscribe()
    this.detection = undefined
  }

  private startPolling() {
    this.stopPolling()
    this.poll = setInterval(this.tick, this.config.pollMs)
  }

  private stopPolling() {
    if (this.poll !== undefined) clearInterval(this.poll)
    this.poll = undefined
  }

  private setState(next: SessionState) {
    this.state = next
    for (const listener of this.listeners) listener()
  }
}

function detectionFields(detection: Detection | undefined): {
  method: CountMethod
  detectedScore?: number
  onsets?: number[]
} {
  if (!detection) return { method: 'manual' }
  return { method: 'mic', detectedScore: detection.count, onsets: detection.onsets }
}

/** A whole number from 0 to MAX_SCORE, or undefined. */
export function parseScore(input: string | number): number | undefined {
  const text = String(input).trim()
  if (!/^\d+$/.test(text)) return undefined
  const value = Number(text)
  return value <= MAX_SCORE ? value : undefined
}
