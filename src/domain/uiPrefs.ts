/** Small interface preferences, remembered between visits. */
export type UiPrefs = {
  /** Whether "How it works" on the 1 minute changes setup screen is open. */
  changesHelpOpen: boolean
}

export const DEFAULT_UI_PREFS: UiPrefs = {
  changesHelpOpen: true,
}

export const UI_PREFS_KEY = 'fretwork.ui.v1'

export interface UiPrefsRepository {
  /** False when browser storage is unusable; preferences then last for this page only. */
  readonly available: boolean
  load(): UiPrefs
  save(prefs: UiPrefs): void
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export class LocalStorageUiPrefs implements UiPrefsRepository {
  available = true
  private prefs: UiPrefs = DEFAULT_UI_PREFS
  private readonly storage: StorageLike | undefined

  constructor(storage?: StorageLike) {
    try {
      this.storage = storage ?? window.localStorage
      const raw = this.storage.getItem(UI_PREFS_KEY)
      if (raw !== null) this.prefs = sanitize(JSON.parse(raw))
    } catch {
      this.available = false
    }
  }

  load(): UiPrefs {
    return this.prefs
  }

  save(prefs: UiPrefs): void {
    this.prefs = prefs
    if (!this.available || !this.storage) return
    try {
      this.storage.setItem(UI_PREFS_KEY, JSON.stringify({ version: 1, ...prefs }))
    } catch {
      this.available = false
    }
  }
}

/** Keep valid fields from stored data, falling back to defaults for anything else. */
function sanitize(value: unknown): UiPrefs {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  return {
    changesHelpOpen: typeof v.changesHelpOpen === 'boolean' ? v.changesHelpOpen : DEFAULT_UI_PREFS.changesHelpOpen,
  }
}
