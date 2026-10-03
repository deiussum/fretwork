import {
  DEFAULT_METRONOME_SETTINGS,
  MAX_BPM,
  MIN_BPM,
  asRecord,
  sanitizeTrainer,
  storedWhole,
  type TrainerSettings,
} from './metronomeSettings'
import { validatePattern, type Direction, type Pattern, type Stroke } from './strumming'
import { DEFAULT_PATTERN_ID, PRESET_PATTERNS, isPreset } from './strummingPresets'

/** What sounds after the count-in: the metronome click, the guide, or both. */
export type SoundChoice = 'click' | 'guide' | 'both'

export const SOUND_CHOICES: readonly SoundChoice[] = ['both', 'guide', 'click']

/** The strumming tool's own tempo and trainer, separate from the standalone metronome's. */
export type StrummingSettings = {
  bpm: number
  trainerOn: boolean
  trainer: TrainerSettings
  sound: SoundChoice
  patternId: string
}

export const DEFAULT_STRUMMING_SETTINGS: StrummingSettings = {
  bpm: 80,
  trainerOn: false,
  trainer: DEFAULT_METRONOME_SETTINGS.trainer,
  sound: 'both',
  patternId: DEFAULT_PATTERN_ID,
}

export const STRUMMING_KEY = 'fretwork.strumming.v1'
export const PATTERNS_KEY = 'fretwork.strumming.patterns.v1'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export interface StrummingSettingsRepository {
  /** False when browser storage is unusable; settings then last for this page only. */
  readonly available: boolean
  load(): StrummingSettings
  save(settings: StrummingSettings): void
}

export interface PatternRepository {
  /** False when browser storage is unusable; patterns then last for this page only. */
  readonly available: boolean
  /** The player's own patterns, in the order they were saved. */
  load(): Pattern[]
  save(patterns: Pattern[]): void
}

/** A JSON value under `key` in browser storage, degrading to memory when storage is unusable. */
class StoredValue<T> {
  available = true
  private value: T
  private readonly storage: StorageLike | undefined
  private readonly key: string
  private readonly serialise: (value: T) => unknown

  constructor(
    key: string,
    fallback: T,
    sanitize: (raw: unknown) => T,
    serialise: (value: T) => unknown,
    storage?: StorageLike,
  ) {
    this.key = key
    this.value = fallback
    this.serialise = serialise
    try {
      this.storage = storage ?? window.localStorage
      const raw = this.storage.getItem(key)
      if (raw !== null) this.value = sanitize(JSON.parse(raw))
    } catch {
      this.available = false
    }
  }

  load(): T {
    return this.value
  }

  save(value: T): void {
    this.value = value
    if (!this.available || !this.storage) return
    try {
      this.storage.setItem(this.key, JSON.stringify(this.serialise(value)))
    } catch {
      this.available = false
    }
  }
}

export class LocalStorageStrummingSettings implements StrummingSettingsRepository {
  private readonly stored: StoredValue<StrummingSettings>

  constructor(storage?: StorageLike) {
    this.stored = new StoredValue(
      STRUMMING_KEY,
      DEFAULT_STRUMMING_SETTINGS,
      sanitizeSettings,
      (s) => ({ version: 1, ...s }),
      storage,
    )
  }

  get available(): boolean {
    return this.stored.available
  }

  load(): StrummingSettings {
    return this.stored.load()
  }

  save(settings: StrummingSettings): void {
    this.stored.save(settings)
  }
}

export class LocalStoragePatterns implements PatternRepository {
  private readonly stored: StoredValue<Pattern[]>

  constructor(storage?: StorageLike) {
    this.stored = new StoredValue(
      PATTERNS_KEY,
      [],
      sanitizePatterns,
      (patterns) => ({ version: 1, patterns }),
      storage,
    )
  }

  get available(): boolean {
    return this.stored.available
  }

  load(): Pattern[] {
    return this.stored.load()
  }

  save(patterns: Pattern[]): void {
    this.stored.save(patterns)
  }
}

/** The pattern with `id` among the presets and `custom`, or Old faithful when it no longer exists. */
export function findPattern(id: string, custom: readonly Pattern[]): Pattern {
  return (
    PRESET_PATTERNS.find((p) => p.id === id) ??
    custom.find((p) => p.id === id) ??
    PRESET_PATTERNS.find((p) => p.id === DEFAULT_PATTERN_ID)!
  )
}

function sanitizeSettings(value: unknown): StrummingSettings {
  const v = asRecord(value)
  const d = DEFAULT_STRUMMING_SETTINGS
  return {
    bpm: storedWhole(v.bpm, MIN_BPM, MAX_BPM, d.bpm),
    trainerOn: typeof v.trainerOn === 'boolean' ? v.trainerOn : d.trainerOn,
    trainer: sanitizeTrainer(v.trainer, d.trainer),
    sound: SOUND_CHOICES.includes(v.sound as SoundChoice) ? (v.sound as SoundChoice) : d.sound,
    patternId: typeof v.patternId === 'string' && v.patternId !== '' ? v.patternId : d.patternId,
  }
}

/** Valid stored patterns; anything invalid is skipped without affecting the rest. */
function sanitizePatterns(value: unknown): Pattern[] {
  const list = asRecord(value).patterns
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const patterns: Pattern[] = []
  for (const entry of list) {
    const pattern = toPattern(entry)
    if (!pattern || seen.has(pattern.id) || isPreset(pattern.id)) continue
    if (validatePattern(pattern).length > 0) continue
    seen.add(pattern.id)
    patterns.push(pattern)
  }
  return patterns
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string')

/** The stored entry's fields with the right types; validatePattern checks their values. */
function toPattern(entry: unknown): Pattern | undefined {
  const v = asRecord(entry)
  const { id, name, beatsPerBar, subdivision, slots } = v
  if (typeof id !== 'string' || id === '' || typeof name !== 'string' || typeof beatsPerBar !== 'number') return
  if (!isStringArray(slots)) return
  const base = { id, name, beatsPerBar, slots: slots as Stroke[] }
  if (subdivision === 3) {
    if (!isStringArray(v.directions)) return
    return { ...base, subdivision, directions: v.directions as Direction[] }
  }
  if ((subdivision === 2 || subdivision === 4) && typeof v.swing === 'number') {
    return { ...base, subdivision, swing: v.swing }
  }
  return undefined
}
