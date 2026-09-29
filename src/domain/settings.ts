export type CountingMode = 'manual' | 'mic'

/** Which input channel to analyse: whichever is louder, or a fixed one. */
export type ChannelOption = 'auto' | 0 | 1

export type InputSettings = {
  mode: CountingMode
  /** Chosen input device; undefined means the browser default. */
  deviceId?: string
  channel: ChannelOption
  /** 0…1, higher detects quieter strums. */
  sensitivity: number
  recordSessions: boolean
}

export const DEFAULT_INPUT_SETTINGS: InputSettings = {
  mode: 'manual',
  channel: 'auto',
  sensitivity: 0.5,
  recordSessions: false,
}

export const SETTINGS_KEY = 'fretwork.settings.v1'

export interface SettingsRepository {
  /** False when browser storage is unusable; settings then last for this page only. */
  readonly available: boolean
  load(): InputSettings
  save(settings: InputSettings): void
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export class LocalStorageSettings implements SettingsRepository {
  available = true
  private settings: InputSettings = DEFAULT_INPUT_SETTINGS
  private readonly storage: StorageLike | undefined

  constructor(storage?: StorageLike) {
    try {
      this.storage = storage ?? window.localStorage
      const raw = this.storage.getItem(SETTINGS_KEY)
      if (raw !== null) this.settings = sanitize(JSON.parse(raw))
    } catch {
      this.available = false
    }
  }

  load(): InputSettings {
    return this.settings
  }

  save(settings: InputSettings): void {
    this.settings = settings
    if (!this.available || !this.storage) return
    try {
      this.storage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, ...settings }))
    } catch {
      this.available = false
    }
  }
}

/** Keep valid fields from stored data, falling back to defaults for anything else. */
function sanitize(value: unknown): InputSettings {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const d = DEFAULT_INPUT_SETTINGS
  return {
    mode: v.mode === 'mic' || v.mode === 'manual' ? v.mode : d.mode,
    deviceId: typeof v.deviceId === 'string' ? v.deviceId : undefined,
    channel: v.channel === 'auto' || v.channel === 0 || v.channel === 1 ? v.channel : d.channel,
    sensitivity:
      typeof v.sensitivity === 'number' && v.sensitivity >= 0 && v.sensitivity <= 1 ? v.sensitivity : d.sensitivity,
    recordSessions: typeof v.recordSessions === 'boolean' ? v.recordSessions : d.recordSessions,
  }
}
