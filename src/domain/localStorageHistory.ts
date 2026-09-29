import type { ChordPair } from './chords'
import type { HistoryRepository, Result } from './history'

export const STORAGE_KEY = 'guitar.oneMinuteChanges.v1'

type StoredData = {
  version: 1
  results: Result[]
  lastPair?: [string, string]
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

/**
 * History persisted in a single localStorage entry.
 *
 * If storage throws or holds unreadable data, the repository switches to
 * in-memory mode (`available === false`) and never writes, so existing data
 * is not overwritten.
 */
export class LocalStorageHistory implements HistoryRepository {
  available = true
  private data: StoredData = { version: 1, results: [] }
  private readonly storage: StorageLike | undefined

  constructor(storage?: StorageLike) {
    try {
      this.storage = storage ?? window.localStorage
      const raw = this.storage.getItem(STORAGE_KEY)
      if (raw !== null) this.data = parse(raw)
    } catch {
      this.available = false
    }
  }

  async loadResults(): Promise<Result[]> {
    return [...this.data.results]
  }

  async addResult(result: Result): Promise<void> {
    this.data = { ...this.data, results: [...this.data.results, result] }
    this.persist()
  }

  async loadLastPair(): Promise<ChordPair | undefined> {
    return this.data.lastPair
  }

  async saveLastPair(pair: ChordPair): Promise<void> {
    this.data = { ...this.data, lastPair: [pair[0], pair[1]] }
    this.persist()
  }

  private persist() {
    if (!this.available || !this.storage) return
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data))
    } catch {
      this.available = false
    }
  }
}

function parse(raw: string): StoredData {
  const value: unknown = JSON.parse(raw)
  if (
    typeof value !== 'object' ||
    value === null ||
    (value as StoredData).version !== 1 ||
    !Array.isArray((value as StoredData).results)
  ) {
    throw new Error('Unrecognised history data')
  }
  return value as StoredData
}
