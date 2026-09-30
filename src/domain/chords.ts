/** Common chords suggested for "1 minute changes". Any other name can be typed. */
export const CHORDS = [
  'A', 'Am', 'A7', 'Asus2', 'Asus4',
  'B', 'Bm', 'B7',
  'C', 'Cadd9', 'C7',
  'D', 'Dm', 'D7', 'Dsus2', 'Dsus4',
  'E', 'Em', 'Em7', 'E7',
  'F', 'Fmaj7',
  'G', 'G/B', 'G7',
] as const

export type Chord = string

/** Longest chord name allowed, so a pair stays readable from playing distance. */
export const MAX_CHORD_LENGTH = 12

/** Trims and collapses whitespace. Case is kept: `Am7` and `AM7` are different chords. */
export function normalizeChord(raw: string): Chord {
  return raw.trim().replace(/\s+/g, ' ')
}

/** Why a (normalised) chord name can't be used, or undefined if it can. */
export function chordNameError(name: Chord): string | undefined {
  if (name === '') return 'Enter a chord.'
  // `|` separates the two chords in `pairKey`.
  if (name.includes('|')) return "Chord names can't contain |."
  if (name.length > MAX_CHORD_LENGTH) return `Chord names can be at most ${MAX_CHORD_LENGTH} characters.`
  return undefined
}

/** Two chords in the order the player picked them (used for display). */
export type ChordPair = readonly [Chord, Chord]

/** Order-independent identity for a pair, e.g. `A|D` for both A↔D and D↔A. */
export function pairKey(a: Chord, b: Chord): string {
  return [a, b].sort().join('|')
}

/** Why a pair can't be practised, or undefined if it can. */
export function pairError(a: Chord, b: Chord): string | undefined {
  const first = normalizeChord(a)
  const second = normalizeChord(b)
  const nameError = chordNameError(first) ?? chordNameError(second)
  if (nameError) return nameError
  if (first === second) return 'Pick two different chords.'
  return undefined
}

export function isValidPair(a: Chord, b: Chord): boolean {
  return pairError(a, b) === undefined
}

export function formatPair([a, b]: ChordPair): string {
  return `${a} ↔ ${b}`
}
