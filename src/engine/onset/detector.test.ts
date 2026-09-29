import { describe, expect, test } from 'vitest'
import { matchOnsets } from '../../test/onsetMatching'
import { strumTimes, synthStrums, VOICINGS } from '../../test/synthStrums'
import { OnsetDetector, detectOnsets } from './detector'

const SR = 48000

describe('OnsetDetector', () => {
  test('counts 40 strums at 1.2 s spacing exactly, within 20 ms', () => {
    const times = strumTimes(40, 1.2)
    const samples = synthStrums({ duration: 49, strums: times.map((time) => ({ time })) })
    const found = detectOnsets(samples, SR)
    expect(found).toHaveLength(40)
    const match = matchOnsets(times, found)
    expect(match.recall).toBe(1)
    expect(match.maxError).toBeLessThanOrEqual(0.02)
  })

  test('silence and low noise produce no onsets', () => {
    expect(detectOnsets(new Float32Array(SR * 10), SR)).toEqual([])
    expect(detectOnsets(synthStrums({ duration: 10, noise: 0.003, strums: [] }), SR)).toEqual([])
  })

  test('two strums 150 ms apart count once', () => {
    const samples = synthStrums({ duration: 3, strums: [{ time: 1 }, { time: 1.15 }] })
    const found = detectOnsets(samples, SR)
    expect(found).toHaveLength(1)
    expect(Math.abs(found[0] - 1)).toBeLessThanOrEqual(0.02)
  })

  test('strums 300 ms apart are both counted', () => {
    const samples = synthStrums({ duration: 3, strums: [{ time: 1 }, { time: 1.3 }] })
    expect(detectOnsets(samples, SR)).toHaveLength(2)
  })

  test('streaming in 128-sample blocks matches offline detection on the caller clock', () => {
    const times = strumTimes(10, 0.8)
    const samples = synthStrums({ duration: 9, strums: times.map((time) => ({ time })) })
    const detector = new OnsetDetector(SR)
    const clockStart = 123.456
    const streamed: number[] = []
    for (let i = 0; i < samples.length; i += 128) {
      streamed.push(...detector.process(samples.subarray(i, i + 128), clockStart + i / SR))
    }
    const offline = detectOnsets(samples, SR)
    expect(streamed.length).toBe(offline.length)
    streamed.forEach((t, i) => expect(t - clockStart).toBeCloseTo(offline[i], 6))
  })

  test('works at 44.1 kHz', () => {
    const times = strumTimes(10, 1)
    const samples = synthStrums({ sampleRate: 44100, duration: 11, strums: times.map((time) => ({ time })) })
    const match = matchOnsets(times, detectOnsets(samples, 44100))
    expect(match.recall).toBe(1)
    expect(match.precision).toBe(1)
  })
})

describe('ringing chords and sensitivity', () => {
  test('strums over a sustained chord at -6 dB: recall ≥ 95% at default sensitivity', () => {
    const times = strumTimes(40, 1.2)
    const samples = synthStrums({
      duration: 49,
      decay: 0.9995,
      strums: times.map((time, i) => ({ time, gain: i % 2 ? 0.25 : 0.5 })),
    })
    const match = matchOnsets(times, detectOnsets(samples, SR))
    expect(match.recall).toBeGreaterThanOrEqual(0.95)
    expect(match.precision).toBeGreaterThanOrEqual(0.95)
  })

  test('repeated strums of the same ringing chord are detected', () => {
    const times = strumTimes(30, 0.9)
    const samples = synthStrums({ duration: 28, decay: 0.999, strums: times.map((time) => ({ time, chord: VOICINGS.G })) })
    expect(matchOnsets(times, detectOnsets(samples, SR)).recall).toBeGreaterThanOrEqual(0.95)
  })

  test('raising sensitivity detects quieter strums', () => {
    const times = strumTimes(20, 1.2)
    const samples = synthStrums({ duration: 25, strums: times.map((time) => ({ time, gain: 0.003 })) })
    const low = detectOnsets(samples, SR, { sensitivity: 0.2 }).length
    const high = detectOnsets(samples, SR, { sensitivity: 0.8 }).length
    expect(high).toBeGreaterThan(low)
    expect(high).toBe(20)
  })

  test('setSensitivity clamps to 0…1', () => {
    const detector = new OnsetDetector(SR)
    detector.setSensitivity(3)
    expect(detector.sensitivity).toBe(1)
    detector.setSensitivity(-1)
    expect(detector.sensitivity).toBe(0)
  })
})
