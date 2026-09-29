import type { Chord, ChordPair } from './chords'

export type CountMethod = 'manual' | 'mic'

export type Result = {
  id: string
  /** Order-independent pair identity, see `pairKey`. */
  pairKey: string
  /** Chords in the order the player picked them. */
  chords: [Chord, Chord]
  /** The score the player confirmed. */
  score: number
  durationSec: number
  /** ISO timestamp. */
  at: string
  method: CountMethod
  /** Count reported by automatic detection, if any. */
  detectedScore?: number
  /** Detected strum times in seconds after "go" (Mic mode). */
  onsets?: number[]
}

export interface HistoryRepository {
  /** False when browser storage is unusable; results then live only in memory. */
  readonly available: boolean
  loadResults(): Promise<Result[]>
  addResult(result: Result): Promise<void>
  loadLastPair(): Promise<ChordPair | undefined>
  saveLastPair(pair: ChordPair): Promise<void>
}

export type PairStats = {
  /** Highest confirmed score, undefined if never practised. */
  best?: number
  /** Most recent confirmed score, undefined if never practised. */
  previous?: number
}

export type PairSummary = {
  pairKey: string
  chords: [Chord, Chord]
  best: number
  latest: number
  attempts: number
  lastAt: string
  /** Newest first. */
  results: Result[]
}

function chronological(results: readonly Result[]): Result[] {
  return [...results].sort((a, b) => a.at.localeCompare(b.at))
}

export function pairStats(results: readonly Result[], key: string): PairStats {
  const forPair = chronological(results.filter((r) => r.pairKey === key))
  if (forPair.length === 0) return {}
  return {
    best: Math.max(...forPair.map((r) => r.score)),
    previous: forPair[forPair.length - 1].score,
  }
}

/** One summary per practised pair, most recently practised first. */
export function summarizeByPair(results: readonly Result[]): PairSummary[] {
  const byKey = new Map<string, Result[]>()
  for (const r of chronological(results)) {
    const list = byKey.get(r.pairKey) ?? []
    list.push(r)
    byKey.set(r.pairKey, list)
  }
  return [...byKey.entries()]
    .map(([key, list]) => {
      const latest = list[list.length - 1]
      return {
        pairKey: key,
        chords: latest.chords,
        best: Math.max(...list.map((r) => r.score)),
        latest: latest.score,
        attempts: list.length,
        lastAt: latest.at,
        results: [...list].reverse(),
      }
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}
