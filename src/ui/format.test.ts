import { expect, test } from 'vitest'
import { formatRemaining } from './format'

test('shows whole seconds remaining as M:SS', () => {
  expect(formatRemaining(60)).toBe('1:00')
  expect(formatRemaining(60 - 13.4)).toBe('0:47')
  expect(formatRemaining(0.2)).toBe('0:01')
  expect(formatRemaining(0)).toBe('0:00')
  expect(formatRemaining(-0.5)).toBe('0:00')
})
