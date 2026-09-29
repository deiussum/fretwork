import { expect, test } from 'vitest'
import { strumTimes, synthStrums } from './synthStrums'

function rmsEnvelope(samples: Float32Array, sampleRate: number, window = 0.01) {
  const size = Math.round(window * sampleRate)
  const env: number[] = []
  for (let i = 0; i + size <= samples.length; i += size) {
    let sum = 0
    for (let j = i; j < i + size; j++) sum += samples[j] * samples[j]
    env.push(Math.sqrt(sum / size))
  }
  return env
}

test('produces the requested length', () => {
  expect(synthStrums({ duration: 2.5, strums: [] })).toHaveLength(120000)
  expect(synthStrums({ duration: 1, sampleRate: 44100, strums: [] })).toHaveLength(44100)
})

test('energy rises sharply at each requested strum time', () => {
  const times = strumTimes(5, 0.8)
  const samples = synthStrums({ duration: 4.5, strums: times.map((time) => ({ time })) })
  const env = rmsEnvelope(samples, 48000)
  for (const time of times) {
    const at = Math.round(time / 0.01)
    const before = env[at - 2]
    const after = Math.max(...env.slice(at, at + 5))
    expect(after).toBeGreaterThan(before * 2)
  }
  // Silence before the first strum.
  expect(Math.max(...env.slice(0, 45))).toBe(0)
})

test('is deterministic for a seed', () => {
  const options = { duration: 1, strums: [{ time: 0.1 }], noise: 0.01, seed: 7 }
  expect(synthStrums(options)).toEqual(synthStrums(options))
})
