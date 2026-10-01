import { expect, test } from 'vitest'
import { DEFAULT_UI_PREFS, LocalStorageUiPrefs, UI_PREFS_KEY } from './uiPrefs'

class MemoryStorage {
  items = new Map<string, string>()
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

test('defaults to the instructions open', () => {
  expect(new LocalStorageUiPrefs(new MemoryStorage()).load()).toEqual({ changesHelpOpen: true })
})

test('preferences round-trip through storage', () => {
  const storage = new MemoryStorage()
  new LocalStorageUiPrefs(storage).save({ changesHelpOpen: false })
  expect(new LocalStorageUiPrefs(storage).load()).toEqual({ changesHelpOpen: false })
  expect(JSON.parse(storage.getItem(UI_PREFS_KEY)!)).toMatchObject({ version: 1 })
})

test('invalid stored fields fall back to defaults', () => {
  const storage = new MemoryStorage()
  storage.setItem(UI_PREFS_KEY, JSON.stringify({ changesHelpOpen: 'no' }))
  expect(new LocalStorageUiPrefs(storage).load()).toEqual(DEFAULT_UI_PREFS)
  storage.setItem(UI_PREFS_KEY, 'not json')
  expect(new LocalStorageUiPrefs(storage).load()).toEqual(DEFAULT_UI_PREFS)
})

test('throwing storage degrades without throwing', () => {
  const throwing = {
    getItem(): string | null {
      throw new Error('SecurityError')
    },
    setItem() {
      throw new Error('SecurityError')
    },
  }
  const repo = new LocalStorageUiPrefs(throwing)
  expect(repo.available).toBe(false)
  expect(repo.load()).toEqual(DEFAULT_UI_PREFS)
  repo.save({ changesHelpOpen: false })
  expect(repo.load().changesHelpOpen).toBe(false)
})
