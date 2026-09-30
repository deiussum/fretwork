import { describe, expect, test } from 'vitest'
import { CHORDS, chordNameError, formatPair, isValidPair, normalizeChord, pairError, pairKey } from './chords'

describe('chord list', () => {
  test('contains every chord required by the spec', () => {
    const required = [
      'A', 'Am', 'A7', 'Asus2', 'Asus4', 'B', 'Bm', 'B7', 'C', 'Cadd9', 'C7', 'D', 'Dm', 'D7', 'Dsus2', 'Dsus4',
      'E', 'Em', 'Em7', 'E7', 'F', 'Fmaj7', 'G', 'G/B', 'G7',
    ]
    for (const chord of required) expect(CHORDS).toContain(chord)
  })

  test('has no duplicates', () => {
    expect(new Set(CHORDS).size).toBe(CHORDS.length)
  })
})

describe('chord names', () => {
  test('normalizeChord trims and collapses whitespace but keeps case', () => {
    expect(normalizeChord('  Am  ')).toBe('Am')
    expect(normalizeChord('Am   add9')).toBe('Am add9')
    expect(normalizeChord('AM7')).toBe('AM7')
  })

  test('chordNameError rejects empty, | and over-long names', () => {
    expect(chordNameError('')).toBe('Enter a chord.')
    expect(chordNameError('A|B')).toMatch(/\|/)
    expect(chordNameError('F#m7b5/E1234')).toBeUndefined()
    expect(chordNameError('F#m7b5/E12345')).toMatch(/at most 12/)
    expect(chordNameError('D/F#')).toBeUndefined()
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

  test('validity uses normalised names and keeps case', () => {
    expect(isValidPair(' Am ', 'D')).toBe(true)
    expect(isValidPair('Am', ' Am')).toBe(false)
    expect(isValidPair('AM7', 'Am7')).toBe(true)
    expect(pairError('', 'D')).toBe('Enter a chord.')
    expect(pairError('A', 'A')).toBe('Pick two different chords.')
  })

  test('formatPair keeps the picked order', () => {
    expect(formatPair(['D', 'A'])).toBe('D ↔ A')
  })
})
