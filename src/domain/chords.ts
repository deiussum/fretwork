/** Common open chords available for "1 minute changes". */
export const CHORDS = [
  'A', 'Am', 'A7',
  'B7',
  'C', 'C7',
  'D', 'Dm', 'D7',
  'E', 'Em', 'E7',
  'Fmaj7',
  'G', 'G7',
] as const

export type Chord = string

/** Two chords in the order the player picked them (used for display). */
export type ChordPair = readonly [Chord, Chord]

/** Order-independent identity for a pair, e.g. `A|D` for both A↔D and D↔A. */
export function pairKey(a: Chord, b: Chord): string {
  return [a, b].sort().join('|')
}

export function isValidPair(a: Chord, b: Chord): boolean {
  return a !== '' && b !== '' && a !== b
}

export function formatPair([a, b]: ChordPair): string {
  return `${a} ↔ ${b}`
}
