import { describe, expect, test } from 'vitest'
import { defaultTripletDirections, parseSlots, type Pattern } from './strumming'
import { DEFAULT_PATTERN_ID } from './strummingPresets'
import {
  DEFAULT_STRUMMING_SETTINGS,
  LocalStoragePatterns,
  LocalStorageStrummingSettings,
  PATTERNS_KEY,
  STRUMMING_KEY,
  findPattern,
} from './strummingSettings'

class MemoryStorage {
  items = new Map<string, string>()
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

const throwing = {
  getItem(): string | null {
    throw new Error('SecurityError')
  },
  setItem() {
    throw new Error('SecurityError')
  },
}

const mine: Pattern = {
  id: 'c1',
  name: 'Mine',
  beatsPerBar: 4,
  subdivision: 2,
  swing: 0.5,
  slots: parseSlots('x.cxx.cx'),
}

const myTriplets: Pattern = {
  id: 'c2',
  name: 'My triplets',
  beatsPerBar: 2,
  subdivision: 3,
  slots: parseSlots('x.xx.x'),
  directions: defaultTripletDirections(6),
}

describe('settings', () => {
  test('defaults: 80 BPM, trainer off, both sounds, Old faithful', () => {
    expect(new LocalStorageStrummingSettings(new MemoryStorage()).load()).toEqual({
      bpm: 80,
      trainerOn: false,
      trainer: { start: 80, step: 5, every: 4, target: 120 },
      sound: 'both',
      patternId: DEFAULT_PATTERN_ID,
    })
  })

  test('round-trip', () => {
    const storage = new MemoryStorage()
    const settings = {
      bpm: 72,
      trainerOn: true,
      trainer: { start: 60, step: 5, every: 4, target: 80 },
      sound: 'guide' as const,
      patternId: 'c1',
    }
    new LocalStorageStrummingSettings(storage).save(settings)
    expect(new LocalStorageStrummingSettings(storage).load()).toEqual(settings)
    expect(JSON.parse(storage.getItem(STRUMMING_KEY)!)).toMatchObject({ version: 1 })
  })

  test('invalid fields fall back to defaults', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      STRUMMING_KEY,
      JSON.stringify({ bpm: 12, trainerOn: 1, trainer: { start: 70, step: 99 }, sound: 'loud', patternId: 5 }),
    )
    const d = DEFAULT_STRUMMING_SETTINGS
    expect(new LocalStorageStrummingSettings(storage).load()).toEqual({
      ...d,
      trainer: { ...d.trainer, start: 70 },
    })
  })

  test('throwing storage degrades without throwing', () => {
    const repo = new LocalStorageStrummingSettings(throwing)
    expect(repo.available).toBe(false)
    repo.save({ ...DEFAULT_STRUMMING_SETTINGS, bpm: 90 })
    expect(repo.load().bpm).toBe(90)
  })
})

describe('custom patterns', () => {
  test('round-trip, straight and triplet', () => {
    const storage = new MemoryStorage()
    new LocalStoragePatterns(storage).save([mine, myTriplets])
    expect(new LocalStoragePatterns(storage).load()).toEqual([mine, myTriplets])
    expect(JSON.parse(storage.getItem(PATTERNS_KEY)!)).toMatchObject({ version: 1 })
  })

  test('invalid entries are skipped one at a time', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      PATTERNS_KEY,
      JSON.stringify({
        version: 1,
        patterns: [
          mine,
          { ...mine, id: 'bad-slots', slots: ['x', 'y'] },
          { ...mine, id: 'all-miss', slots: Array(8).fill('miss') },
          { ...mine, id: 'no-swing', swing: undefined },
          { ...myTriplets, directions: ['down'] },
          { ...mine, id: 'preset:old-faithful' },
          { ...mine, name: 'Duplicate id' },
          'nonsense',
        ],
      }),
    )
    expect(new LocalStoragePatterns(storage).load()).toEqual([mine])
  })

  test('unparseable storage gives no patterns', () => {
    const storage = new MemoryStorage()
    storage.setItem(PATTERNS_KEY, '{')
    expect(new LocalStoragePatterns(storage).load()).toEqual([])
  })

  test('throwing storage keeps patterns for the page', () => {
    const repo = new LocalStoragePatterns(throwing)
    expect(repo.available).toBe(false)
    repo.save([mine])
    expect(repo.load()).toEqual([mine])
  })
})

describe('findPattern', () => {
  test('finds presets and custom patterns', () => {
    expect(findPattern('preset:shuffle', []).name).toBe('Shuffle')
    expect(findPattern('c1', [mine])).toBe(mine)
  })

  test('a missing pattern falls back to Old faithful', () => {
    expect(findPattern('deleted', [mine]).id).toBe(DEFAULT_PATTERN_ID)
  })
})
