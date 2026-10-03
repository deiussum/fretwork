/** What the strumming hand does on one slot of a pattern. */
export type Stroke = 'hit' | 'accent' | 'chuck' | 'miss'

export type Direction = 'down' | 'up'

/** Slots per beat: 8ths, triplets or 16ths. */
export type Subdivision = 2 | 3 | 4

type PatternBase = {
  id: string
  name: string
  beatsPerBar: number
  /** Every slot of every bar, in order: bars × beatsPerBar × subdivision. */
  slots: Stroke[]
}

/** 8ths or 16ths. Direction follows the slot: down on even slots, up on odd ones. */
export type StraightPattern = PatternBase & {
  subdivision: 2 | 4
  /** 0 is straight, 1 puts the second slot of each pair two-thirds of the way through it. */
  swing: number
}

/** Triplets set the direction of each slot themselves. */
export type TripletPattern = PatternBase & {
  subdivision: 3
  /** One per slot. */
  directions: Direction[]
}

export type Pattern = StraightPattern | TripletPattern

export const MIN_PATTERN_BEATS = 1
export const MAX_PATTERN_BEATS = 12
export const MIN_PATTERN_BARS = 1
export const MAX_PATTERN_BARS = 4

export const STROKE_CYCLE: readonly Stroke[] = ['hit', 'accent', 'chuck', 'miss']

/** The stroke after `stroke` when a slot is chosen in the editor. */
export function nextStroke(stroke: Stroke): Stroke {
  return STROKE_CYCLE[(STROKE_CYCLE.indexOf(stroke) + 1) % STROKE_CYCLE.length]
}

export function slotsPerBar(pattern: Pick<Pattern, 'beatsPerBar' | 'subdivision'>): number {
  return pattern.beatsPerBar * pattern.subdivision
}

export function barsOf(pattern: Pattern): number {
  return pattern.slots.length / slotsPerBar(pattern)
}

/** Direction of slot `index`, counting from the start of the pattern. */
export function directionOf(pattern: Pattern, index: number): Direction {
  if (pattern.subdivision === 3) return pattern.directions[index] ?? 'down'
  return index % 2 === 0 ? 'down' : 'up'
}

/** Down, up, down for each beat. */
export function defaultTripletDirections(slotCount: number): Direction[] {
  return Array.from({ length: slotCount }, (_, i) => (i % 3 === 1 ? 'up' : 'down'))
}

/** Count label of a slot within its bar: "1 &", "1 e & a" or "1 trip let". */
export function countLabel(subdivision: Subdivision, slotInBar: number): string {
  const beat = Math.floor(slotInBar / subdivision) + 1
  const k = slotInBar % subdivision
  if (k === 0) return String(beat)
  if (subdivision === 2) return '&'
  if (subdivision === 3) return k === 1 ? 'trip' : 'let'
  return ['e', '&', 'a'][k - 1]
}

/** Problems that stop a pattern from being saved or played, one message each; empty when valid. */
export function validatePattern(pattern: Pattern): string[] {
  const problems: string[] = []
  if (pattern.name.trim() === '') problems.push('Give the pattern a name.')
  const beatsOk =
    Number.isInteger(pattern.beatsPerBar) &&
    pattern.beatsPerBar >= MIN_PATTERN_BEATS &&
    pattern.beatsPerBar <= MAX_PATTERN_BEATS
  if (!beatsOk) problems.push(`Beats per bar must be from ${MIN_PATTERN_BEATS} to ${MAX_PATTERN_BEATS}.`)
  if (![2, 3, 4].includes(pattern.subdivision)) problems.push('Choose 8ths, 16ths or triplets.')
  else if (beatsOk) {
    const bars = barsOf(pattern)
    if (!Number.isInteger(bars) || bars < MIN_PATTERN_BARS || bars > MAX_PATTERN_BARS) {
      problems.push(`A pattern must be ${MIN_PATTERN_BARS} to ${MAX_PATTERN_BARS} bars long.`)
    }
  }
  if (pattern.slots.some((s) => !STROKE_CYCLE.includes(s))) problems.push('Every slot needs a stroke.')
  if (pattern.subdivision === 3) {
    const dirs = pattern.directions
    if (dirs.length !== pattern.slots.length || dirs.some((d) => d !== 'down' && d !== 'up')) {
      problems.push('Every slot needs a direction.')
    }
  } else if (!(pattern.swing >= 0 && pattern.swing <= 1)) {
    problems.push('Swing must be from 0% to 100%.')
  }
  if (pattern.slots.every((s) => s !== 'hit' && s !== 'accent' && s !== 'chuck')) {
    problems.push('A pattern needs at least one strum.')
  }
  return problems
}

const NOTATION: Record<string, Stroke> = { x: 'hit', '>': 'accent', c: 'chuck', '.': 'miss' }
const SYMBOL: Record<Stroke, string> = { hit: 'x', accent: '>', chuck: 'c', miss: '.' }

/**
 * Slots from the short notation used in the spec: `x` hit, `>` accent,
 * `c` chuck, `.` miss. `|` between bars and spaces are ignored.
 */
export function parseSlots(notation: string): Stroke[] {
  const slots: Stroke[] = []
  for (const ch of notation) {
    if (ch === '|' || ch === ' ') continue
    const stroke = NOTATION[ch]
    if (!stroke) throw new Error(`Unknown stroke symbol "${ch}" in "${notation}"`)
    slots.push(stroke)
  }
  return slots
}

/** The notation for a pattern's slots, with `|` between bars. */
export function formatSlots(pattern: Pattern): string {
  const perBar = slotsPerBar(pattern)
  let out = ''
  pattern.slots.forEach((s, i) => {
    if (i > 0 && i % perBar === 0) out += '|'
    out += SYMBOL[s]
  })
  return out
}

/** A change to a pattern's shape in the editor. */
export type ShapeChange =
  | { beatsPerBar: number }
  | { subdivision: Subdivision }
  | { bars: number }

/**
 * The pattern with a new beats per bar, subdivision or number of bars. Each
 * bar keeps the strokes (and triplet directions) of slots that still exist,
 * at the same position in the bar; new slots are misses. Changing to triplets
 * starts every direction at down, up, down; changing away from them starts
 * swing at 0.
 */
export function reshapePattern(pattern: Pattern, change: ShapeChange): Pattern {
  const beatsPerBar = 'beatsPerBar' in change ? change.beatsPerBar : pattern.beatsPerBar
  const subdivision = 'subdivision' in change ? change.subdivision : pattern.subdivision
  const bars = 'bars' in change ? change.bars : barsOf(pattern)
  const oldPerBar = slotsPerBar(pattern)
  const newPerBar = beatsPerBar * subdivision
  const oldBars = barsOf(pattern)

  const remap = <T>(values: readonly T[], fill: (index: number) => T): T[] =>
    Array.from({ length: bars * newPerBar }, (_, i) => {
      const bar = Math.floor(i / newPerBar)
      const slot = i % newPerBar
      return bar < oldBars && slot < oldPerBar ? values[bar * oldPerBar + slot] : fill(i)
    })

  const slots = remap(pattern.slots, () => 'miss' as Stroke)
  const base = { id: pattern.id, name: pattern.name, beatsPerBar, slots }
  if (subdivision === 3) {
    const defaults = defaultTripletDirections(slots.length)
    const directions =
      pattern.subdivision === 3 ? remap(pattern.directions, (i) => defaults[i]) : defaults
    return { ...base, subdivision, directions }
  }
  return { ...base, subdivision, swing: pattern.subdivision === 3 ? 0 : pattern.swing }
}
