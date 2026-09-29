import { expect, test } from 'vitest'
import { synthStrums } from '../../test/synthStrums'
import type { WorkletEvent } from './messages'
import { StrumProcessorCore } from './strumProcessor'

const SR = 48000

function run(core: StrumProcessorCore, channels: Float32Array[], startTime: number) {
  const events: WorkletEvent[] = []
  for (let i = 0; i < channels[0].length; i += 128) {
    events.push(...core.process(channels.map((c) => c.subarray(i, i + 128)), startTime + i / SR))
  }
  return events
}

test('detects strums on the louder channel with audio-clock times', () => {
  const guitar = synthStrums({ duration: 3, strums: [{ time: 0.5 }, { time: 1.7 }] })
  const quietMic = new Float32Array(guitar.length)
  const events = run(new StrumProcessorCore(SR), [quietMic, guitar], 10)
  const onsets = events.filter((e) => e.type === 'onset').map((e) => e.time)
  expect(onsets).toHaveLength(2)
  expect(Math.abs(onsets[0] - 10.5)).toBeLessThan(0.02)
  expect(Math.abs(onsets[1] - 11.7)).toBeLessThan(0.02)
})

test('posts level about every 33 ms with the selected channel', () => {
  const events = run(new StrumProcessorCore(SR), [new Float32Array(SR).fill(0.25)], 0)
  const levels = events.filter((e) => e.type === 'level')
  expect(levels.length).toBeGreaterThanOrEqual(29)
  expect(levels.length).toBeLessThanOrEqual(31)
  expect(levels[5]).toMatchObject({ rms: 0.25, peak: 0.25, channel: 0, channelCount: 1 })
})

test('records chunks only while recording, with contiguous start times', () => {
  const core = new StrumProcessorCore(SR)
  const signal = Float32Array.from({ length: SR }, (_, i) => Math.sin(i / 10))
  expect(run(core, [signal.subarray(0, 12800)], 0).some((e) => e.type === 'chunk')).toBe(false)

  core.configure({ type: 'config', recording: true })
  const events = run(core, [signal.subarray(12800, 12800 + 10000)], 12800 / SR)
  const stopEvents = core.configure({ type: 'config', recording: false })
  const chunks = [...events, ...stopEvents].filter((e) => e.type === 'chunk')

  expect(chunks.reduce((n, c) => n + c.samples.length, 0)).toBe(10000)
  expect(chunks[0].startTime).toBeCloseTo(12800 / SR, 9)
  expect(chunks[1].startTime).toBeCloseTo((12800 + 4096) / SR, 9)
  expect(chunks[0].samples[0]).toBe(signal[12800])
})
