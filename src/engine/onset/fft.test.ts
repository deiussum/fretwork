import { expect, test } from 'vitest'
import { RealFFT } from './fft'

function sine(size: number, bin: number, amplitude: number, phase = 0) {
  return Float64Array.from({ length: size }, (_, n) => amplitude * Math.sin((2 * Math.PI * bin * n) / size + phase))
}

test.each([
  [64, 5, 1],
  [1024, 37, 0.5],
  [2048, 300, 0.25],
])('size %i: a sine at bin %i peaks there with the expected magnitude', (size, bin, amplitude) => {
  const fft = new RealFFT(size)
  const out = new Float64Array(size / 2 + 1)
  fft.magnitudes(sine(size, bin, amplitude, 0.3), out)
  const peak = out.indexOf(Math.max(...out))
  expect(peak).toBe(bin)
  const expected = (amplitude * size) / 2
  expect(Math.abs(out[bin] - expected) / expected).toBeLessThan(0.01)
})

test('two sines produce two peaks', () => {
  const size = 512
  const input = sine(size, 10, 1).map((v, i) => v + sine(size, 60, 0.5)[i])
  const out = new Float64Array(size / 2 + 1)
  new RealFFT(size).magnitudes(input, out)
  const top = [...out.keys()].sort((a, b) => out[b] - out[a]).slice(0, 2).sort((a, b) => a - b)
  expect(top).toEqual([10, 60])
})

test('rejects sizes that are not powers of two', () => {
  expect(() => new RealFFT(1000)).toThrow()
})
