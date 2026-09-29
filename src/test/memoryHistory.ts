import type { ChordPair } from '../domain/chords'
import type { HistoryRepository, Result } from '../domain/history'

/** In-memory HistoryRepository for tests. */
export class MemoryHistory implements HistoryRepository {
  available = true
  results: Result[] = []
  lastPair: ChordPair | undefined

  async loadResults() {
    return [...this.results]
  }
  async addResult(result: Result) {
    this.results.push(result)
  }
  async loadLastPair() {
    return this.lastPair
  }
  async saveLastPair(pair: ChordPair) {
    this.lastPair = pair
  }
}
