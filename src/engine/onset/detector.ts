import { RealFFT } from './fft'

export type DetectorConfig = {
  /** Analysis window length; rounded to a power of two in samples. */
  windowSec: number
  /** Distance between analysis frames. */
  hopSec: number
  minFreq: number
  maxFreq: number
  /** Length of the running-median history used for the adaptive threshold. */
  medianSec: number
  /** How far past a candidate peak to look before accepting it. */
  lookaheadSec: number
  /** Onsets closer than this to the previous one are merged into it. */
  refractorySec: number
  /** 0…1: higher detects quieter strums. */
  sensitivity: number
  /** Threshold margin above the median at sensitivity 1 and 0. */
  marginRange: readonly [number, number]
  /** Frames quieter than this RMS (dBFS) never produce onsets; at sensitivity 1 and 0. */
  floorDbRange: readonly [number, number]
  /** Log compression strength: larger is closer to a pure log (level-independent). */
  logGain: number
  /** Constant subtracted from peak-frame times to align with the attack. */
  latencySec: number
  /**
   * A strum excites every string at once, so most of the spectrum jumps; finger
   * noise while changing chords only changes a narrow slice. A candidate needs
   * at least this share of bins to have risen by `broadbandRise` compared with
   * `broadbandSpanSec` earlier. 0 disables the check.
   */
  minBroadband: number
  broadbandRise: number
  /** Compare the spectrum this long before the candidate… */
  broadbandSpanSec: number
  /** …with the spectrum this long after it (a slow thumb strum takes a while to reach every string). */
  broadbandAfterSec: number
}

export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  windowSec: 0.02,
  hopSec: 0.005,
  minFreq: 80,
  maxFreq: 8000,
  medianSec: 0.5,
  lookaheadSec: 0.015,
  refractorySec: 0.25,
  sensitivity: 0.5,
  marginRange: [0.08, 0.26],
  floorDbRange: [-75, -56],
  logGain: 1e5,
  latencySec: 0,
  minBroadband: 0.3,
  broadbandRise: Math.LN2, // 6 dB in log-magnitude units
  broadbandSpanSec: 0.06,
  broadbandAfterSec: 0.03,
}

/**
 * Streaming spectral-flux onset detector. Feed contiguous blocks of samples
 * with the time of each block's first sample; returns onset times (on the
 * same clock) as they are confirmed, about `lookaheadSec` + one window late.
 * Pure and allocation-light so it can run in an AudioWorklet or offline.
 */
export class OnsetDetector {
  readonly sampleRate: number
  private config: DetectorConfig
  private readonly windowSize: number
  private readonly hopSize: number
  private readonly fft: RealFFT
  private readonly hann: Float32Array
  private readonly ring: Float32Array
  private ringPos = 0
  private samplesSeen = 0
  private sinceHop = 0
  private readonly frame: Float32Array
  private readonly mags: Float64Array
  /** Recent log spectra, newest at `frameCount - 1`. */
  private readonly spectra: Float64Array[]
  private frameCount = 0
  private readonly broadbandSpan: number
  private readonly broadbandAfter: number
  /** Frames to wait before deciding on a candidate: enough for peak picking and the broadband check. */
  private readonly decisionDelay: number
  private readonly firstBin: number
  private readonly lastBin: number
  private readonly lookahead: number
  private readonly history: Float64Array
  private readonly sorted: Float64Array
  private historyCount = 0
  /** Recent frames awaiting a peak decision: flux, threshold, time, rms. */
  private pending: { flux: number; threshold: number; time: number; loud: boolean; frame: number }[] = []
  private lastOnset = -Infinity
  private originTime: number | undefined

  constructor(sampleRate: number, config: Partial<DetectorConfig> = {}) {
    this.sampleRate = sampleRate
    this.config = { ...DEFAULT_DETECTOR_CONFIG, ...config }
    this.windowSize = 2 ** Math.round(Math.log2(this.config.windowSec * sampleRate))
    this.hopSize = Math.max(1, Math.round(this.config.hopSec * sampleRate))
    this.fft = new RealFFT(this.windowSize)
    this.hann = Float32Array.from(
      { length: this.windowSize },
      (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / this.windowSize),
    )
    this.ring = new Float32Array(this.windowSize)
    this.frame = new Float32Array(this.windowSize)
    this.mags = new Float64Array(this.windowSize / 2 + 1)
    const binHz = sampleRate / this.windowSize
    this.firstBin = Math.max(1, Math.floor(this.config.minFreq / binHz))
    this.lastBin = Math.min(this.windowSize / 2, Math.ceil(this.config.maxFreq / binHz))
    this.lookahead = Math.max(1, Math.round(this.config.lookaheadSec / this.config.hopSec))
    this.broadbandSpan = Math.max(1, Math.round(this.config.broadbandSpanSec / this.config.hopSec))
    this.broadbandAfter = Math.max(1, Math.round(this.config.broadbandAfterSec / this.config.hopSec))
    this.decisionDelay = Math.max(this.lookahead, this.broadbandAfter)
    this.spectra = Array.from(
      { length: this.broadbandSpan + this.decisionDelay + 2 },
      () => new Float64Array(this.mags.length),
    )
    const historyFrames = Math.max(3, Math.round(this.config.medianSec / this.config.hopSec))
    this.history = new Float64Array(historyFrames)
    this.sorted = new Float64Array(historyFrames)
  }

  /** Actual analysis window length in seconds. */
  get windowSec(): number {
    return this.windowSize / this.sampleRate
  }

  get sensitivity(): number {
    return this.config.sensitivity
  }

  setSensitivity(sensitivity: number): void {
    this.config = { ...this.config, sensitivity: Math.min(1, Math.max(0, sensitivity)) }
  }

  /** Feed a block; returns onsets confirmed during this call. */
  process(samples: ArrayLike<number>, blockStartTime: number): number[] {
    if (this.originTime === undefined) this.originTime = blockStartTime - this.samplesSeen / this.sampleRate
    const onsets: number[] = []
    for (let i = 0; i < samples.length; i++) {
      this.ring[this.ringPos] = samples[i]
      this.ringPos = (this.ringPos + 1) % this.windowSize
      this.samplesSeen++
      if (++this.sinceHop >= this.hopSize && this.samplesSeen >= this.windowSize) {
        this.sinceHop = 0
        const onset = this.analyseFrame()
        if (onset !== undefined) onsets.push(onset)
      }
    }
    return onsets
  }

  private analyseFrame(): number | undefined {
    const { windowSize, ring, ringPos, frame, hann, mags } = this
    let energy = 0
    for (let i = 0; i < windowSize; i++) {
      const sample = ring[(ringPos + i) % windowSize]
      energy += sample * sample
      frame[i] = sample * hann[i]
    }
    this.fft.magnitudes(frame, mags)

    // Log-compressed magnitudes (amplitude-normalised), then half-wave-rectified flux.
    const scale = 2 / windowSize
    const curr = this.spectrum(this.frameCount)
    const prev = this.spectrum(this.frameCount - 1)
    let flux = 0
    for (let k = this.firstBin; k <= this.lastBin; k++) {
      const value = Math.log1p(this.config.logGain * mags[k] * scale)
      curr[k] = value
      const rise = value - prev[k]
      if (rise > 0) flux += rise
    }
    flux /= this.lastBin - this.firstBin + 1
    const frameIndex = this.frameCount++

    const rms = Math.sqrt(energy / windowSize)
    const loud = 20 * Math.log10(rms + 1e-12) > this.floorDb()
    // Centre of the analysis window, on the caller's clock.
    const time = this.originTime! + (this.samplesSeen - windowSize / 2) / this.sampleRate - this.config.latencySec
    const threshold = this.median() + this.margin()
    this.pushHistory(flux)

    this.pending.push({ flux, threshold, time, loud, frame: frameIndex })
    return this.decide()
  }

  /** Decide on the frame `decisionDelay` frames back, now that frames after it are known. */
  private decide(): number | undefined {
    const pending = this.pending
    const index = pending.length - 1 - this.decisionDelay
    if (index < 1) return undefined
    const candidate = pending[index]
    let result: number | undefined
    if (candidate.loud && candidate.flux > candidate.threshold && candidate.flux >= pending[index - 1].flux) {
      let isPeak = true
      for (let j = index + 1; j <= index + this.lookahead; j++) {
        if (pending[j].flux > candidate.flux) isPeak = false
      }
      if (
        isPeak &&
        candidate.time - this.lastOnset >= this.config.refractorySec &&
        this.isBroadband(candidate.frame)
      ) {
        this.lastOnset = candidate.time
        result = candidate.time
      }
    }
    pending.shift()
    return result
  }

  /** Log spectrum of frame `n` (valid for the last `spectra.length` frames). */
  private spectrum(n: number): Float64Array {
    const length = this.spectra.length
    return this.spectra[((n % length) + length) % length]
  }

  /**
   * Compare the frame `broadbandAfter` after the candidate with the frame
   * `broadbandSpan` before it: did most of the spectrum rise?
   */
  private isBroadband(candidateFrame: number): boolean {
    const { minBroadband, broadbandRise } = this.config
    if (minBroadband <= 0) return true
    const beforeFrame = candidateFrame - this.broadbandSpan
    if (beforeFrame < 0) return true
    const after = this.spectrum(candidateFrame + this.broadbandAfter)
    const before = this.spectrum(beforeFrame)
    let rising = 0
    for (let k = this.firstBin; k <= this.lastBin; k++) {
      if (after[k] - before[k] > broadbandRise) rising++
    }
    return rising / (this.lastBin - this.firstBin + 1) >= minBroadband
  }

  private floorDb(): number {
    const [atMax, atMin] = this.config.floorDbRange
    return atMin + (atMax - atMin) * this.config.sensitivity
  }

  private margin(): number {
    const [atMax, atMin] = this.config.marginRange
    return atMin + (atMax - atMin) * this.config.sensitivity
  }

  private pushHistory(flux: number) {
    this.history[this.historyCount % this.history.length] = flux
    this.historyCount++
  }

  private median(): number {
    const count = Math.min(this.historyCount, this.history.length)
    if (count === 0) return 0
    const sorted = this.sorted.subarray(0, count)
    sorted.set(this.history.subarray(0, count))
    sorted.sort()
    return sorted[count >> 1]
  }
}

/** Run a detector over a whole buffer (offline use: tests, CLI). */
export function detectOnsets(samples: Float32Array, sampleRate: number, config: Partial<DetectorConfig> = {}): number[] {
  const detector = new OnsetDetector(sampleRate, config)
  const onsets = detector.process(samples, 0)
  const duration = samples.length / sampleRate
  // Flush the look-ahead with a little silence. The abrupt cut to silence is
  // itself a click, so ignore anything within one window of the end.
  onsets.push(...detector.process(new Float32Array(Math.round(sampleRate * 0.1)), duration))
  const lastValid = duration - detector.windowSec
  return onsets.filter((t) => t < lastValid)
}
