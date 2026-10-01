import { expect, test } from 'vitest'
import { TapTempo } from './tapTempo'

const tapAll = (times: number[]) => {
  const taps = new TapTempo()
  return times.map((t) => taps.tap(t))
}

test('a single tap gives no tempo', () => {
  expect(new TapTempo().tap(10)).toBeUndefined()
})

test('five taps 0.667 s apart give 90 BPM', () => {
  const results = tapAll([0, 0.667, 1.334, 2.001, 2.668].map((t) => t + 5))
  expect(results[4]).toBe(90)
})

test('a gap of more than 2 s starts a new measurement', () => {
  const results = tapAll([0, 0.5, 3.5, 4.5])
  expect(results[1]).toBe(120)
  expect(results[2]).toBeUndefined()
  expect(results[3]).toBe(60)
})

test('averages only the last 4 intervals', () => {
  // A slow first interval (1 s) is dropped once four faster ones follow.
  const results = tapAll([0, 1, 1.5, 2, 2.5, 3])
  expect(results[5]).toBe(120)
})

test('clamps to 30–300 BPM', () => {
  expect(tapAll([0, 0.1])[1]).toBe(300)
  expect(tapAll([0, 1.99])[1]).toBe(30)
})
