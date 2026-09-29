import { expect, test } from 'vitest'
import { readLabels } from './labels'
import { SessionRecording, recordingFileBase } from './sessionRecording'
import { decodeWav } from './wav'

const SR = 1000 // small rate keeps the arithmetic readable

function ramp(start: number, length: number) {
  return Float32Array.from({ length }, (_, i) => ((start + i) % 1000) / 1000)
}

test('trims chunks to exactly [from, to)', () => {
  // Input sample n has value n/1000 and sits at time n/1000 s.
  const recording = new SessionRecording(0.25, 1.75, SR)
  for (let n = 0; n < 2000; n += 300) recording.addChunk({ startTime: n / SR, samples: ramp(n, 300) })
  const samples = recording.samples()
  expect(samples.length).toBe(1500)
  expect(samples[0]).toBeCloseTo(0.25, 6)
  expect(samples[749]).toBeCloseTo(0.999, 6)
  expect(samples[1499]).toBeCloseTo(0.749, 6)
})

test('gaps between chunks stay silent', () => {
  const recording = new SessionRecording(0, 1, SR)
  recording.addChunk({ startTime: 0.5, samples: new Float32Array(100).fill(0.5) })
  const samples = recording.samples()
  expect(samples[499]).toBe(0)
  expect(samples[500]).toBe(0.5)
  expect(samples[600]).toBe(0)
})

test('labels are relative to the WAV start and limited to the span', () => {
  const recording = new SessionRecording(10.15, 74.15, SR)
  ;[10, 11.15, 14.4, 74.1, 74.2].forEach((t) => recording.addOnset(t))
  expect(recording.labelTimes().map((t) => +t.toFixed(6))).toEqual([1, 4.25, 63.95])
})

test('build produces a matching WAV and label file', () => {
  const recording = new SessionRecording(2, 3, 8000)
  recording.addChunk({ startTime: 2, samples: new Float32Array(8000).fill(0.25) })
  recording.addOnset(2.5)
  const { wav, labels } = recording.build()
  const decoded = decodeWav(wav)
  expect(decoded.sampleRate).toBe(8000)
  expect(decoded.channels[0]).toHaveLength(8000)
  expect(readLabels(labels)).toEqual([{ start: 0.5, end: 0.5, text: 'strum' }])
})

test('file base name uses the pair and local date/time', () => {
  expect(recordingFileBase(['A', 'D'], new Date(2026, 8, 29, 10, 15, 0))).toBe('fretwork-A-D-2026-09-29T10-15-00')
  expect(recordingFileBase(['Fmaj7', 'C#'], new Date(2026, 0, 2, 3, 4, 5))).toBe('fretwork-Fmaj7-C-2026-01-02T03-04-05')
})
