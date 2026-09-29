import { describe, expect, test } from 'vitest'
import type { Result } from './history'
import { LocalStorageHistory, STORAGE_KEY } from './localStorageHistory'

class MemoryStorage {
  items = new Map<string, string>()
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

const throwingStorage = {
  getItem(): string | null {
    throw new Error('SecurityError')
  },
  setItem() {
    throw new Error('SecurityError')
  },
}

const sample: Result = {
  id: '1',
  pairKey: 'A|D',
  chords: ['A', 'D'],
  score: 34,
  durationSec: 60,
  at: '2026-09-28T10:00:00Z',
  method: 'manual',
}

describe('LocalStorageHistory', () => {
  test('results and last pair survive a fresh repository instance', async () => {
    const storage = new MemoryStorage()
    const repo = new LocalStorageHistory(storage)
    await repo.addResult(sample)
    await repo.saveLastPair(['D', 'A'])

    const reopened = new LocalStorageHistory(storage)
    expect(await reopened.loadResults()).toEqual([sample])
    expect(await reopened.loadLastPair()).toEqual(['D', 'A'])
    expect(reopened.available).toBe(true)
  })

  test('stores data under the versioned key', async () => {
    const storage = new MemoryStorage()
    await new LocalStorageHistory(storage).addResult(sample)
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toMatchObject({ version: 1, results: [sample] })
  })

  test('throwing storage degrades to memory without throwing to callers', async () => {
    const repo = new LocalStorageHistory(throwingStorage)
    expect(repo.available).toBe(false)
    await repo.addResult(sample)
    expect(await repo.loadResults()).toEqual([sample])
  })

  test('a write failure degrades to memory', async () => {
    const storage = new MemoryStorage()
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    const repo = new LocalStorageHistory(storage)
    await repo.addResult(sample)
    expect(repo.available).toBe(false)
    expect(await repo.loadResults()).toEqual([sample])
  })

  test('unreadable data is not overwritten', async () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, 'not json')
    const repo = new LocalStorageHistory(storage)
    expect(repo.available).toBe(false)
    await repo.addResult(sample)
    expect(storage.getItem(STORAGE_KEY)).toBe('not json')
  })
})

test('history saved before strum detection (no onsets field) still loads', async () => {
  const storage = new MemoryStorage()
  const legacy = { version: 1, results: [sample], lastPair: ['A', 'D'] }
  storage.setItem(STORAGE_KEY, JSON.stringify(legacy))
  const repo = new LocalStorageHistory(storage)
  expect(repo.available).toBe(true)
  expect(await repo.loadResults()).toEqual([sample])
})
