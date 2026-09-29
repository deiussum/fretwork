import { expect, test } from 'vitest'
import { DEFAULT_INPUT_SETTINGS, LocalStorageSettings, SETTINGS_KEY } from './settings'

class MemoryStorage {
  items = new Map<string, string>()
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

test('defaults to manual mode, auto channel, mid sensitivity, recording off', () => {
  expect(new LocalStorageSettings(new MemoryStorage()).load()).toEqual({
    mode: 'manual',
    channel: 'auto',
    sensitivity: 0.5,
    recordSessions: false,
  })
})

test('settings round-trip through storage', () => {
  const storage = new MemoryStorage()
  const settings = { mode: 'mic', deviceId: 'volt-in-2', channel: 1, sensitivity: 0.7, recordSessions: true } as const
  new LocalStorageSettings(storage).save(settings)
  expect(new LocalStorageSettings(storage).load()).toEqual(settings)
  expect(JSON.parse(storage.getItem(SETTINGS_KEY)!)).toMatchObject({ version: 1 })
})

test('invalid stored fields fall back to defaults', () => {
  const storage = new MemoryStorage()
  storage.setItem(SETTINGS_KEY, JSON.stringify({ mode: 'banjo', channel: 7, sensitivity: 3, deviceId: 'x' }))
  expect(new LocalStorageSettings(storage).load()).toEqual({ ...DEFAULT_INPUT_SETTINGS, deviceId: 'x' })
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
  const repo = new LocalStorageSettings(throwing)
  expect(repo.available).toBe(false)
  expect(repo.load()).toEqual(DEFAULT_INPUT_SETTINGS)
  repo.save({ ...DEFAULT_INPUT_SETTINGS, mode: 'mic' })
  expect(repo.load().mode).toBe('mic')
})
