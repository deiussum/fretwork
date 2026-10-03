import { expect, test } from 'vitest'
import { formatSlots, validatePattern } from './strumming'
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
