import { describe, expect, test } from 'vitest'
import {
  barsOf,
  countLabel,
  defaultTripletDirections,
  directionOf,
  formatSlots,
  nextStroke,
  parseSlots,
  reshapePattern,
  validatePattern,
  type Pattern,
  type StraightPattern,
  type TripletPattern,
} from './strumming'

const straight = (slots: string, extra: Partial<StraightPattern> = {}): StraightPattern => ({
  id: 'p',
  name: 'Test',
  beatsPerBar: 4,
  subdivision: 2,
  swing: 0,
  slots: parseSlots(slots),
  ...extra,
})

const triplet = (slots: string, extra: Partial<TripletPattern> = {}): TripletPattern => {
  const parsed = parseSlots(slots)
  return {
    id: 't',
    name: 'Triplets',
    beatsPerBar: 4,
    subdivision: 3,
    slots: parsed,
    directions: defaultTripletDirections(parsed.length),
    ...extra,
  }
}

describe('structure', () => {
  test('Old faithful has 8 slots in one bar', () => {
    const p = straight('x.xx.xxx')
    expect(p.slots).toEqual(['hit', 'miss', 'hit', 'hit', 'miss', 'hit', 'hit', 'hit'])
    expect(barsOf(p)).toBe(1)
    expect(validatePattern(p)).toEqual([])
  })

  test('a two-bar pattern has two bars', () => {
    const p = straight('x.xx.xxx|x.xx.x..')
    expect(p.slots).toHaveLength(16)
    expect(barsOf(p)).toBe(2)
    expect(formatSlots(p)).toBe('x.xx.xxx|x.xx.x..')
  })

  test('notation covers all strokes and rejects unknown symbols', () => {
    expect(parseSlots('x > c .')).toEqual(['hit', 'accent', 'chuck', 'miss'])
    expect(() => parseSlots('xq')).toThrow()
  })

  test('strokes cycle hit, accent, chuck, miss', () => {
    expect([nextStroke('hit'), nextStroke('accent'), nextStroke('chuck'), nextStroke('miss')]).toEqual([
      'accent',
      'chuck',
      'miss',
      'hit',
    ])
  })
})

describe('direction', () => {
  test('8ths: down on the beat, up on the &', () => {
    const p = straight('x.xx.xxx')
    expect([0, 1, 2, 3].map((i) => directionOf(p, i))).toEqual(['down', 'up', 'down', 'up'])
  })

  test('16ths: 1 and & down, e and a up', () => {
    const p = straight('xxxxxxxxxxxxxxxx', { subdivision: 4 })
    expect([0, 1, 2, 3].map((i) => directionOf(p, i))).toEqual(['down', 'up', 'down', 'up'])
  })

  test('triplets default to down, up, down per beat', () => {
    expect(defaultTripletDirections(6)).toEqual(['down', 'up', 'down', 'down', 'up', 'down'])
  })

  test('triplets use their own directions', () => {
    const p = triplet('xxxxxxxxxxxx')
    p.directions[1] = 'down'
    p.directions[2] = 'up'
    expect([0, 1, 2].map((i) => directionOf(p, i))).toEqual(['down', 'down', 'up'])
  })
})

describe('count labels', () => {
  test('8ths', () => {
    expect([0, 1, 2, 3].map((i) => countLabel(2, i))).toEqual(['1', '&', '2', '&'])
  })
  test('16ths', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => countLabel(4, i))).toEqual(['1', 'e', '&', 'a', '2', 'e', '&', 'a'])
  })
  test('triplets', () => {
    expect([0, 1, 2, 3].map((i) => countLabel(3, i))).toEqual(['1', 'trip', 'let', '2'])
  })
})

describe('validation', () => {
  test('empty name', () => {
    expect(validatePattern(straight('x.......', { name: '  ' }))).toEqual(['Give the pattern a name.'])
  })

  test('all misses', () => {
    expect(validatePattern(straight('........'))).toEqual(['A pattern needs at least one strum.'])
  })

  test('beats per bar out of range', () => {
    expect(validatePattern(straight('x'.repeat(26), { beatsPerBar: 13 }))).toContain(
      'Beats per bar must be from 1 to 12.',
    )
  })

  test('slots not a whole number of bars, or too many bars', () => {
    expect(validatePattern(straight('x.x'))).toContain('A pattern must be 1 to 4 bars long.')
    expect(validatePattern(straight('x'.repeat(40)))).toContain('A pattern must be 1 to 4 bars long.')
    expect(validatePattern(straight(''))).toContain('A pattern must be 1 to 4 bars long.')
  })

  test('swing out of range', () => {
    expect(validatePattern(straight('x.......', { swing: 1.5 }))).toEqual(['Swing must be from 0% to 100%.'])
    expect(validatePattern(straight('x.......', { swing: Number.NaN }))).toEqual(['Swing must be from 0% to 100%.'])
  })

  test('triplet directions must match the slots', () => {
    expect(validatePattern(triplet('xxxxxxxxxxxx', { directions: ['down'] }))).toEqual([
      'Every slot needs a direction.',
    ])
  })

  test('unknown stroke or subdivision', () => {
    const bad = { ...straight('x.......'), slots: ['hit', 'boom'] } as unknown as Pattern
    expect(validatePattern(bad)).toContain('Every slot needs a stroke.')
    const sub = { ...straight('x.......'), subdivision: 5 } as unknown as Pattern
    expect(validatePattern(sub)).toContain('Choose 8ths, 16ths or triplets.')
  })
})

describe('reshape', () => {
  test('8ths to 16ths keeps the first 8 slots and fills with misses', () => {
    const p = reshapePattern(straight('x.xx.xxx', { swing: 0.5 }), { subdivision: 4 })
    expect(p.subdivision).toBe(4)
    expect(formatSlots(p)).toBe('x.xx.xxx........')
    expect(p.subdivision !== 3 && p.swing).toBe(0.5)
  })

  test('fewer beats drops the end of each bar', () => {
    const p = reshapePattern(straight('x.xx.xxx|xxxxxxxx'), { beatsPerBar: 3 })
    expect(formatSlots(p)).toBe('x.xx.x|xxxxxx')
  })

  test('more bars adds bars of misses; fewer drops them', () => {
    expect(formatSlots(reshapePattern(straight('x.xx.xxx'), { bars: 2 }))).toBe('x.xx.xxx|........')
    expect(formatSlots(reshapePattern(straight('x.xx.xxx|xxxxxxxx'), { bars: 1 }))).toBe('x.xx.xxx')
  })

  test('to triplets starts down, up, down and drops swing', () => {
    const p = reshapePattern(straight('x.xx.xxx', { swing: 1 }), { subdivision: 3 })
    expect(p).toMatchObject({ subdivision: 3, directions: defaultTripletDirections(12) })
    expect('swing' in p).toBe(false)
    expect(formatSlots(p)).toBe('x.xx.xxx....')
  })

  test('from triplets starts swing at 0', () => {
    const p = reshapePattern(triplet('xxxxxxxxxxxx'), { subdivision: 2 })
    expect(p).toMatchObject({ subdivision: 2, swing: 0 })
    expect('directions' in p).toBe(false)
  })

  test('triplets keep their directions when beats change', () => {
    const t = triplet('xxxxxxxxxxxx')
    t.directions[0] = 'up'
    const p = reshapePattern(t, { beatsPerBar: 5 }) as TripletPattern
    expect(p.directions[0]).toBe('up')
    expect(p.directions.slice(12)).toEqual(['down', 'up', 'down'])
  })
})
