import { describe, expect, test } from 'vitest'
import { defaultTripletDirections, parseSlots, type Pattern } from '../../domain/strumming'
import type { Beat } from '../metronome/metronome'
import { expandBeat, slotAt, slotFraction } from './slotTiming'

const beat = (time: number, bpm: number, beatInBar = 0): Beat => ({ time, bar: 1, beatInBar, beatsPerBar: 4, bpm })

const oldFaithful: Pattern = {
  id: 'p',
  name: 'Old faithful',
  beatsPerBar: 4,
  subdivision: 2,
  swing: 0,
  slots: parseSlots('x.xx.xxx'),
}

describe('swing', () => {
  test('straight 8ths at 120 BPM: & is 0.25 s after the beat', () => {
    const [, and] = expandBeat(beat(10, 120), oldFaithful, 0)
    expect(and.time - 10).toBeCloseTo(0.25, 9)
  })

  test('full swing 8ths at 120 BPM: & is 0.333 s after the beat', () => {
    const [, and] = expandBeat(beat(10, 120), { ...oldFaithful, swing: 1 }, 0)
    expect(and.time - 10).toBeCloseTo(1 / 3, 9)
  })

  test('swung 16ths at 60 BPM: e 0.333, & 0.5, a 0.833 s after the beat', () => {
    const p: Pattern = { ...oldFaithful, subdivision: 4, swing: 1, slots: parseSlots('x'.repeat(16)) }
    const times = expandBeat(beat(0, 60), p, 0).map((s) => s.time)
    expect(times[0]).toBe(0)
    expect(times[1]).toBeCloseTo(1 / 3, 9)
    expect(times[2]).toBeCloseTo(0.5, 9)
    expect(times[3]).toBeCloseTo(5 / 6, 9)
  })

  test('half swing moves the & linearly', () => {
    expect(slotFraction(1, 2, 0.5)).toBeCloseTo(0.5 + 1 / 12, 9)
  })
})

test('triplets fall on thirds and use their directions', () => {
  const p: Pattern = {
    id: 't',
    name: 'T',
    beatsPerBar: 4,
    subdivision: 3,
    slots: parseSlots('x.x'.repeat(4)),
    directions: defaultTripletDirections(12),
  }
  const strokes = expandBeat(beat(0, 60, 1), p, 0)
  expect(strokes.map((s) => s.time)).toEqual([0, 1 / 3, 2 / 3])
  expect(strokes.map((s) => s.slot)).toEqual([3, 4, 5])
  expect(strokes.map((s) => s.direction)).toEqual(['down', 'up', 'down'])
  expect(strokes.map((s) => s.stroke)).toEqual(['hit', 'miss', 'hit'])
})

test('slot strokes and directions come from the right bar of the pattern', () => {
  const p: Pattern = { ...oldFaithful, slots: parseSlots('x.xx.xxx|>c......') }
  const strokes = expandBeat(beat(0, 120, 0), p, 1)
  expect(strokes.map((s) => [s.stroke, s.direction, s.barInPattern])).toEqual([
    ['accent', 'down', 1],
    ['chuck', 'up', 1],
  ])
})

test('beat length follows the beat tempo', () => {
  const [, and] = expandBeat(beat(0, 60), oldFaithful, 0)
  expect(and.time).toBeCloseTo(0.5, 9)
})

test('slotAt finds the sounding slot, with swing', () => {
  const b = beat(0, 60, 2)
  expect(slotAt(b, oldFaithful, 0.1)).toBe(4)
  expect(slotAt(b, oldFaithful, 0.5)).toBe(5)
  expect(slotAt(b, { ...oldFaithful, swing: 1 }, 0.6)).toBe(4)
  expect(slotAt(b, { ...oldFaithful, swing: 1 }, 0.7)).toBe(5)
})
