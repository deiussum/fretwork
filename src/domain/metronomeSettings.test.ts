import { expect, test } from 'vitest'
import { DEFAULT_METRONOME_SETTINGS, LocalStorageMetronomeSettings, METRONOME_KEY } from './metronomeSettings'

class MemoryStorage {
  items = new Map<string, string>()
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

test('defaults to 100 BPM, 4 beats, trainer off at 80 +5 every 4 to 120', () => {
  expect(new LocalStorageMetronomeSettings(new MemoryStorage()).load()).toEqual({
    bpm: 100,
    beatsPerBar: 4,
    trainerOn: false,
    trainer: { start: 80, step: 5, every: 4, target: 120 },
  })
})

test('settings round-trip through storage', () => {
  const storage = new MemoryStorage()
  const settings = { bpm: 72, beatsPerBar: 3, trainerOn: true, trainer: { start: 95, step: 5, every: 2, target: 140 } }
  new LocalStorageMetronomeSettings(storage).save(settings)
  expect(new LocalStorageMetronomeSettings(storage).load()).toEqual(settings)
  expect(JSON.parse(storage.getItem(METRONOME_KEY)!)).toMatchObject({ version: 1 })
})

test('invalid stored fields fall back to defaults', () => {
  const storage = new MemoryStorage()
  storage.setItem(
    METRONOME_KEY,
    JSON.stringify({ bpm: 400, beatsPerBar: 2.5, trainerOn: 'yes', trainer: { start: 90, step: 0, every: 'x' } }),
  )
  const d = DEFAULT_METRONOME_SETTINGS
  expect(new LocalStorageMetronomeSettings(storage).load()).toEqual({
    ...d,
    trainer: { start: 90, step: d.trainer.step, every: d.trainer.every, target: d.trainer.target },
  })
})

test('unparseable storage falls back to defaults', () => {
  const storage = new MemoryStorage()
  storage.setItem(METRONOME_KEY, 'not json')
  const repo = new LocalStorageMetronomeSettings(storage)
  expect(repo.load()).toEqual(DEFAULT_METRONOME_SETTINGS)
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
  const repo = new LocalStorageMetronomeSettings(throwing)
  expect(repo.available).toBe(false)
  expect(repo.load()).toEqual(DEFAULT_METRONOME_SETTINGS)
  repo.save({ ...DEFAULT_METRONOME_SETTINGS, bpm: 72 })
  expect(repo.load().bpm).toBe(72)
})
