import { describe, expect, test } from 'vitest'
import { CHORDS, formatPair, isValidPair, pairKey } from './chords'

describe('chord list', () => {
  test('contains every chord required by the spec', () => {
    const required = ['A', 'Am', 'A7', 'B7', 'C', 'C7', 'D', 'Dm', 'D7', 'E', 'Em', 'E7', 'Fmaj7', 'G', 'G7']
    for (const chord of required) expect(CHORDS).toContain(chord)
  })

  test('has no duplicates', () => {
    expect(new Set(CHORDS).size).toBe(CHORDS.length)
  })
})

describe('pairs', () => {
  test('pairKey is order-independent', () => {
    expect(pairKey('D', 'A')).toBe(pairKey('A', 'D'))
    expect(pairKey('A', 'D')).toBe('A|D')
  })

  test('identical chords are not a valid pair', () => {
    expect(isValidPair('A', 'A')).toBe(false)
    expect(isValidPair('A', '')).toBe(false)
    expect(isValidPair('A', 'D')).toBe(true)
  })

  test('formatPair keeps the picked order', () => {
    expect(formatPair(['D', 'A'])).toBe('D ↔ A')
  })
})
