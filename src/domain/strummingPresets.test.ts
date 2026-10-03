import { expect, test } from 'vitest'
import { barsOf, directionOf, formatSlots, slotsPerBar, validatePattern } from './strumming'
import { DEFAULT_PATTERN_ID, PRESET_PATTERNS, isPreset } from './strummingPresets'

test('every preset is valid', () => {
  for (const p of PRESET_PATTERNS) expect(validatePattern(p), p.name).toEqual([])
})

test('preset ids are unique and marked as presets', () => {
  const ids = PRESET_PATTERNS.map((p) => p.id)
  expect(new Set(ids).size).toBe(ids.length)
  expect(ids.every(isPreset)).toBe(true)
  expect(isPreset('custom-1')).toBe(false)
})

test('Old faithful is the default', () => {
  const p = PRESET_PATTERNS.find((p) => p.id === DEFAULT_PATTERN_ID)!
  expect(p.name).toBe('Old faithful')
  expect(formatSlots(p)).toBe('x.xx.xxx')
})

test('Shuffle is fully swung', () => {
  const p = PRESET_PATTERNS.find((p) => p.name === 'Shuffle')!
  expect(p.subdivision === 3 ? undefined : p.swing).toBe(1)
})

test('Wonderwall is two bars of 16ths with the taught strum directions', () => {
  const p = PRESET_PATTERNS.find((p) => p.id === 'preset:wonderwall')!
  expect(p).toMatchObject({ name: 'Wonderwall', subdivision: 4, swing: 0 })
  expect(barsOf(p)).toBe(2)
  const strums = (bar: number) =>
    p.slots
      .map((stroke, i) => ({ stroke, i }))
      .filter(({ stroke, i }) => stroke !== 'miss' && Math.floor(i / slotsPerBar(p)) === bar)
      .map(({ i }) => (directionOf(p, i) === 'down' ? 'D' : 'U'))
      .join(' ')
  expect(strums(0)).toBe('D D D D U D U D D D U')
  expect(strums(1)).toBe('D U D D D U U U D U D U')
})
