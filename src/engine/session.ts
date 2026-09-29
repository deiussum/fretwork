import { pairKey, type ChordPair } from '../domain/chords'
import { pairStats, type HistoryRepository } from '../domain/history'
import type { Clock } from './clock'
import type { SoundScheduler } from './sounds'

export type SessionConfig = {
  countInBeats: number
  beatSec: number
  runSec: number
  /** Delay between pressing start and the first click, so it can be scheduled cleanly. */
  leadSec: number
  /** How often state transitions are checked against the clock. */
  pollMs: number
}

export const DEFAULT_CONFIG: SessionConfig = {
  countInBeats: 4,
  beatSec: 1,
  runSec: 60,
  leadSec: 0.15,
  pollMs: 50,
}

export const MAX_SCORE = 999

export type SessionState =
  | { kind: 'idle' }
  | { kind: 'countIn'; pair: ChordPair; firstBeatTime: number; goTime: number; endTime: number }
  | { kind: 'running'; pair: ChordPair; goTime: number; endTime: number }
  | { kind: 'confirming'; pair: ChordPair; suggestedScore?: number; error?: string }
  | {
      kind: 'result'
      pair: ChordPair
      score: number
      /** Scores for the pair from before this attempt. */
      previous?: number
      best?: number
      isNewBest: boolean
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
  async start(pair: ChordPair): Promise<void> {
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

    this.setState({ kind: 'countIn', pair, firstBeatTime, goTime, endTime })
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
        method: 'manual',
      })
      if (generation !== this.generation) return
      this.setState({
        kind: 'result',
        pair: state.pair,
        score,
        previous: before.previous,
        best: before.best,
        isNewBest: before.best === undefined || score > before.best,
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
      this.setState({ kind: 'running', pair: state.pair, goTime: state.goTime, endTime: state.endTime })
    }
    const next = this.state
    if (next.kind === 'running' && t >= next.endTime) {
      this.stopPolling()
      this.setState({ kind: 'confirming', pair: next.pair })
    }
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

/** A whole number from 0 to MAX_SCORE, or undefined. */
export function parseScore(input: string | number): number | undefined {
  const text = String(input).trim()
  if (!/^\d+$/.test(text)) return undefined
  const value = Number(text)
  return value <= MAX_SCORE ? value : undefined
}
