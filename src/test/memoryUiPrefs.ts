import { DEFAULT_UI_PREFS, type UiPrefs, type UiPrefsRepository } from '../domain/uiPrefs'

/** In-memory UI preferences for tests. */
export class MemoryUiPrefs implements UiPrefsRepository {
  readonly available = true
  saved: UiPrefs[] = []
  private prefs: UiPrefs

  constructor(prefs: Partial<UiPrefs> = {}) {
    this.prefs = { ...DEFAULT_UI_PREFS, ...prefs }
  }

  load(): UiPrefs {
    return this.prefs
  }

  save(prefs: UiPrefs): void {
    this.prefs = prefs
    this.saved.push(prefs)
  }
}
