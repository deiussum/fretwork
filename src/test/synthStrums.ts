/** Chord voicings as string frequencies in Hz (low to high). */
export const VOICINGS = {
  A: [110, 164.81, 220, 277.18, 329.63],
  D: [146.83, 220, 293.66, 369.99],
  C: [130.81, 164.81, 196, 261.63, 329.63],
  G: [98, 123.47, 146.83, 196, 246.94, 392],
} as const

export type SynthStrum = {
  /** Onset time in seconds (the first string sounds here). */
  time: number
  chord?: readonly number[]
  /** Peak gain, default 0.5. */
  gain?: number
}

export type SynthOptions = {
  sampleRate?: number
  duration: number
  strums: readonly SynthStrum[]
  /** How long strings ring: 0.990 (short) … 0.9995 (very long). Default 0.996. */
  decay?: number
  /** Gaussian-ish noise RMS level, default 0. */
  noise?: number
  /** Sine beeps, e.g. the app's "go" sound picked up by a mic. */
  beeps?: readonly { time: number; freq: number; duration: number; gain: number }[]
  seed?: number
}

/**
 * Karplus-Strong strummed chords for detector tests. Deterministic for a
 * given seed. Strings are spread ~8 ms apart like a real down-strum.
 */
export function synthStrums(options: SynthOptions): Float32Array {
  const sampleRate = options.sampleRate ?? 48000
  const out = new Float32Array(Math.round(options.duration * sampleRate))
  const random = mulberry32(options.seed ?? 1)
  const decay = options.decay ?? 0.996

  options.strums.forEach((strum, index) => {
    const chord = strum.chord ?? (index % 2 === 0 ? VOICINGS.A : VOICINGS.D)
    const gain = (strum.gain ?? 0.5) / chord.length
    chord.forEach((freq, stringIndex) => {
      const start = Math.round((strum.time + stringIndex * 0.008) * sampleRate)
      pluck(out, start, freq, sampleRate, gain, decay, random)
    })
  })

  for (const beep of options.beeps ?? []) {
    const start = Math.round(beep.time * sampleRate)
    const length = Math.round(beep.duration * sampleRate)
    for (let i = 0; i < length && start + i < out.length; i++) {
      const env = Math.min(1, i / 96, (length - i) / 96)
      out[start + i] += beep.gain * env * Math.sin((2 * Math.PI * beep.freq * i) / sampleRate)
    }
  }

  if (options.noise) {
    for (let i = 0; i < out.length; i++) {
      out[i] += options.noise * (random() + random() + random() - 1.5) * 2
    }
  }
  return out
}

function pluck(
  out: Float32Array,
  start: number,
  freq: number,
  sampleRate: number,
  gain: number,
  decay: number,
  random: () => number,
) {
  const period = Math.max(2, Math.round(sampleRate / freq))
  const buffer = Float32Array.from({ length: period }, () => random() * 2 - 1)
  // Stop once the string has died away (-80 dB) to keep generation fast.
  const length = Math.min(out.length - start, Math.ceil(Math.log(1e-4) / Math.log(decay)) * period)
  for (let i = 0; i < length; i++) {
    const j = i % period
    const next = buffer[(j + 1) % period]
    const sample = buffer[j]
    out[start + i] += gain * sample
    buffer[j] = decay * 0.5 * (sample + next)
  }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Evenly spaced strums, e.g. `strumTimes(40, 1.2, 0.5)`. */
export function strumTimes(count: number, spacing: number, first = 0.5): number[] {
  return Array.from({ length: count }, (_, i) => first + i * spacing)
}
