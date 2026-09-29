import { describe, expect, test } from 'vitest'
import { pairStats, summarizeByPair, type Result } from './history'

function result(pairKey: string, score: number, at: string): Result {
  const [a, b] = pairKey.split('|')
  return { id: `${pairKey}-${at}`, pairKey, chords: [a, b], score, durationSec: 60, at, method: 'manual' }
}

describe('pairStats', () => {
  test('best is the highest and previous is the most recent score', () => {
    const results = [
      result('A|D', 28, '2026-09-01T10:00:00Z'),
      result('A|D', 34, '2026-09-02T10:00:00Z'),
      result('A|D', 31, '2026-09-03T10:00:00Z'),
      result('C|G', 50, '2026-09-04T10:00:00Z'),
    ]
    expect(pairStats(results, 'A|D')).toEqual({ best: 34, previous: 31 })
  })

  test('uses chronological order regardless of array order', () => {
    const results = [result('A|D', 31, '2026-09-03T10:00:00Z'), result('A|D', 28, '2026-09-01T10:00:00Z')]
    expect(pairStats(results, 'A|D').previous).toBe(31)
  })

  test('a pair without history has no best or previous (not zero)', () => {
    const stats = pairStats([result('C|G', 50, '2026-09-04T10:00:00Z')], 'A|D')
    expect(stats.best).toBeUndefined()
    expect(stats.previous).toBeUndefined()
  })
})

describe('summarizeByPair', () => {
  test('summarises each pair with best, latest, attempts and last date', () => {
    const results = [
      result('A|D', 28, '2026-09-01T10:00:00Z'),
      result('C|G', 40, '2026-09-02T10:00:00Z'),
      result('A|D', 34, '2026-09-03T10:00:00Z'),
      result('A|D', 31, '2026-09-04T10:00:00Z'),
    ]
    const [first, second] = summarizeByPair(results)
    expect(first).toMatchObject({ pairKey: 'A|D', best: 34, latest: 31, attempts: 3, lastAt: '2026-09-04T10:00:00Z' })
    expect(first.results.map((r) => r.score)).toEqual([31, 34, 28])
    expect(second).toMatchObject({ pairKey: 'C|G', best: 40, latest: 40, attempts: 1 })
  })
})
