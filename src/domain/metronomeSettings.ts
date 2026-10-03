export const MIN_BPM = 30
export const MAX_BPM = 300

/** Speed trainer: start at `start` BPM, add `step` every `every` bars, hold at `target`. */
export type TrainerSettings = {
  start: number
  step: number
  every: number
  target: number
}

export type MetronomeSettings = {
  bpm: number
  beatsPerBar: number
  trainerOn: boolean
  trainer: TrainerSettings
}

export const MIN_BEATS_PER_BAR = 1
export const MAX_BEATS_PER_BAR = 12

export const DEFAULT_METRONOME_SETTINGS: MetronomeSettings = {
  bpm: 100,
  beatsPerBar: 4,
  trainerOn: false,
  trainer: { start: 80, step: 5, every: 4, target: 120 },
}

export const METRONOME_KEY = 'fretwork.metronome.v1'

export interface MetronomeSettingsRepository {
  /** False when browser storage is unusable; settings then last for this page only. */
  readonly available: boolean
  load(): MetronomeSettings
  save(settings: MetronomeSettings): void
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export class LocalStorageMetronomeSettings implements MetronomeSettingsRepository {
  available = true
  private settings: MetronomeSettings = DEFAULT_METRONOME_SETTINGS
  private readonly storage: StorageLike | undefined

  constructor(storage?: StorageLike) {
    try {
      this.storage = storage ?? window.localStorage
      const raw = this.storage.getItem(METRONOME_KEY)
      if (raw !== null) this.settings = sanitize(JSON.parse(raw))
    } catch {
      this.available = false
    }
  }

  load(): MetronomeSettings {
    return this.settings
  }

  save(settings: MetronomeSettings): void {
    this.settings = settings
    if (!this.available || !this.storage) return
    try {
      this.storage.setItem(METRONOME_KEY, JSON.stringify({ version: 1, ...settings }))
    } catch {
      this.available = false
    }
  }
}

/** Keep valid fields from stored data, falling back to defaults for anything else. */
function sanitize(value: unknown): MetronomeSettings {
  const v = asRecord(value)
  const d = DEFAULT_METRONOME_SETTINGS
  return {
    bpm: storedWhole(v.bpm, MIN_BPM, MAX_BPM, d.bpm),
    beatsPerBar: storedWhole(v.beatsPerBar, MIN_BEATS_PER_BAR, MAX_BEATS_PER_BAR, d.beatsPerBar),
    trainerOn: typeof v.trainerOn === 'boolean' ? v.trainerOn : d.trainerOn,
    trainer: sanitizeTrainer(v.trainer, d.trainer),
  }
}

/** A stored whole number within `min`..`max`, or `fallback`. */
export function storedWhole(n: unknown, min: number, max: number, fallback: number): number {
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : fallback
}

/**
 * Stored speed trainer settings. Individual fields are kept even if the
 * combination is invalid (e.g. target below start); the trainer form reports
 * that rather than silently resetting.
 */
export function sanitizeTrainer(value: unknown, fallback: TrainerSettings): TrainerSettings {
  const t = asRecord(value)
  return {
    start: storedWhole(t.start, MIN_BPM, MAX_BPM, fallback.start),
    step: storedWhole(t.step, 1, 50, fallback.step),
    every: storedWhole(t.every, 1, 64, fallback.every),
    target: storedWhole(t.target, MIN_BPM, MAX_BPM, fallback.target),
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
}
