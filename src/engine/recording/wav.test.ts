import { describe, expect, test } from 'vitest'
import { decodeWav, encodeWav } from './wav'

describe('encodeWav', () => {
  test('writes a mono 16-bit PCM header', () => {
    const bytes = encodeWav(new Float32Array(100), 44100)
    const view = new DataView(bytes.buffer)
    const ascii = (at: number) => String.fromCharCode(...bytes.slice(at, at + 4))
    expect(ascii(0)).toBe('RIFF')
    expect(ascii(8)).toBe('WAVE')
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint32(24, true)).toBe(44100)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(200)
    expect(bytes.byteLength).toBe(244)
  })

  test('round-trips within one 16-bit step', () => {
    const samples = Float32Array.from({ length: 4800 }, (_, i) => 0.9 * Math.sin(i / 7) * Math.cos(i / 300))
    const decoded = decodeWav(encodeWav(samples, 48000))
    expect(decoded.sampleRate).toBe(48000)
    expect(decoded.channels).toHaveLength(1)
    const [out] = decoded.channels
    expect(out.length).toBe(samples.length)
    let maxError = 0
    for (let i = 0; i < samples.length; i++) maxError = Math.max(maxError, Math.abs(out[i] - samples[i]))
    expect(maxError).toBeLessThanOrEqual(1 / 0x7fff)
  })

  test('clips out-of-range samples', () => {
    const [out] = decodeWav(encodeWav(Float32Array.from([2, -2]), 8000)).channels
    expect(out[0]).toBeCloseTo(1, 3)
    expect(out[1]).toBe(-1)
  })
})

describe('decodeWav', () => {
  function wav(fmt: { format: number; channels: number; bits: number }, frames: number[][], extraChunk = false) {
    const bytesPerSample = fmt.bits / 8
    const dataBytes = frames.length * fmt.channels * bytesPerSample
    const extra = extraChunk ? 8 + 5 + 1 : 0 // odd-sized chunk plus padding
    const buffer = new ArrayBuffer(44 + extra + dataBytes)
    const v = new DataView(buffer)
    const put = (at: number, s: string) => [...s].forEach((ch, i) => v.setUint8(at + i, ch.charCodeAt(0)))
    put(0, 'RIFF')
    v.setUint32(4, buffer.byteLength - 8, true)
    put(8, 'WAVE')
    put(12, 'fmt ')
    v.setUint32(16, 16, true)
    v.setUint16(20, fmt.format, true)
    v.setUint16(22, fmt.channels, true)
    v.setUint32(24, 22050, true)
    v.setUint16(34, fmt.bits, true)
    let at = 36
    if (extraChunk) {
      put(at, 'LIST')
      v.setUint32(at + 4, 5, true)
      at += 8 + 5 + 1
    }
    put(at, 'data')
    v.setUint32(at + 4, dataBytes, true)
    at += 8
    for (const frame of frames) {
      for (const value of frame) {
        if (fmt.format === 3) v.setFloat32(at, value, true)
        else if (fmt.bits === 24) {
          const int = Math.round(value * 0x7fffff)
          v.setUint8(at, int & 0xff)
          v.setUint8(at + 1, (int >> 8) & 0xff)
          v.setInt8(at + 2, int >> 16)
        } else v.setInt16(at, Math.round(value * 0x7fff), true)
        at += bytesPerSample
      }
    }
    return new Uint8Array(buffer)
  }

  test('reads 32-bit float stereo (Audacity default) and skips other chunks', () => {
    const decoded = decodeWav(wav({ format: 3, channels: 2, bits: 32 }, [[0.5, -0.25], [0.125, 1]], true))
    expect(decoded.sampleRate).toBe(22050)
    expect([...decoded.channels[0]]).toEqual([0.5, 0.125])
    expect([...decoded.channels[1]]).toEqual([-0.25, 1])
  })

  test('reads 24-bit PCM', () => {
    const [out] = decodeWav(wav({ format: 1, channels: 1, bits: 24 }, [[0.5], [-0.5]])).channels
    expect(out[0]).toBeCloseTo(0.5, 5)
    expect(out[1]).toBeCloseTo(-0.5, 5)
  })

  test('rejects non-WAV data', () => {
    expect(() => decodeWav(new Uint8Array(64))).toThrow('Not a WAV file')
  })
})
