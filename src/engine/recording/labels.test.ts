import { expect, test } from 'vitest'
import { pointLabels, readLabels, writeLabels } from './labels'

test('writes point labels in Audacity format', () => {
  expect(writeLabels(pointLabels([0.5, 1.25]))).toBe('0.500000\t0.500000\tstrum\n1.250000\t1.250000\tstrum\n')
})

test('round-trips labels', () => {
  const labels = [
    { start: 0.123456, end: 0.123456, text: 'strum' },
    { start: 2, end: 2.5, text: 'A chord' },
  ]
  expect(readLabels(writeLabels(labels))).toEqual(labels)
})

test('parses a label file exported from Audacity', () => {
  // Audacity 3.x export: CRLF-tolerant, spectral selection lines start with "\".
  const exported = '4.180726\t4.180726\t1\r\n\\\t-1.000000\t-1.000000\r\n5.371451\t5.371451\t\r\n\r\n'
  expect(readLabels(exported)).toEqual([
    { start: 4.180726, end: 4.180726, text: '1' },
    { start: 5.371451, end: 5.371451, text: '' },
  ])
})

test('rejects malformed lines', () => {
  expect(() => readLabels('abc\tdef\tx')).toThrow('Invalid label line')
})
