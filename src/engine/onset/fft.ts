/**
 * Radix-2 FFT for real input, returning the magnitude spectrum.
 * Allocation-free after construction so it can run on the audio thread.
 */
export class RealFFT {
  readonly size: number
  private readonly re: Float64Array
  private readonly im: Float64Array
  private readonly cos: Float64Array
  private readonly sin: Float64Array
  private readonly reversed: Uint32Array

  constructor(size: number) {
    if (size < 2 || (size & (size - 1)) !== 0) throw new Error(`FFT size must be a power of two, got ${size}`)
    this.size = size
    this.re = new Float64Array(size)
    this.im = new Float64Array(size)
    this.cos = new Float64Array(size / 2)
    this.sin = new Float64Array(size / 2)
    for (let i = 0; i < size / 2; i++) {
      this.cos[i] = Math.cos((2 * Math.PI * i) / size)
      this.sin[i] = -Math.sin((2 * Math.PI * i) / size)
    }
    this.reversed = new Uint32Array(size)
    const bits = Math.log2(size)
    for (let i = 0; i < size; i++) {
      let r = 0
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b)
      this.reversed[i] = r
    }
  }

  /** Writes `size / 2 + 1` magnitudes of `input` (length `size`) into `out`. */
  magnitudes(input: ArrayLike<number>, out: Float32Array | Float64Array): void {
    const { size, re, im, cos, sin, reversed } = this
    for (let i = 0; i < size; i++) {
      re[reversed[i]] = input[i]
      im[i] = 0
    }
    for (let len = 2; len <= size; len <<= 1) {
      const half = len >> 1
      const step = size / len
      for (let start = 0; start < size; start += len) {
        for (let k = 0; k < half; k++) {
          const c = cos[k * step]
          const s = sin[k * step]
          const a = start + k
          const b = a + half
          const tr = re[b] * c - im[b] * s
          const ti = re[b] * s + im[b] * c
          re[b] = re[a] - tr
          im[b] = im[a] - ti
          re[a] += tr
          im[a] += ti
        }
      }
    }
    for (let k = 0; k <= size / 2; k++) out[k] = Math.hypot(re[k], im[k])
  }
}
