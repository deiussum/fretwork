import type { ChordPair } from '../../domain/chords'
import { pointLabels, writeLabels } from './labels'
import { encodeWav } from './wav'

/**
 * One session's raw input between two audio-clock times, plus the strums
 * detected in it. Chunks may start before `from` or run past `to`; they are
 * trimmed to exactly that span when built.
 */
export class SessionRecording {
  readonly from: number
  readonly to: number
  readonly sampleRate: number
  private readonly chunks: { startTime: number; samples: Float32Array }[] = []
  private readonly onsets: number[] = []

  constructor(from: number, to: number, sampleRate: number) {
    this.from = from
    this.to = to
    this.sampleRate = sampleRate
  }

  addChunk(chunk: { startTime: number; samples: Float32Array }): void {
    if (chunk.startTime >= this.to) return
    this.chunks.push(chunk)
  }

  addOnset(time: number): void {
    if (time >= this.from && time < this.to) this.onsets.push(time)
  }

  /** Mono samples covering [from, to); gaps are silent. */
  samples(): Float32Array {
    const { sampleRate } = this
    const out = new Float32Array(Math.round((this.to - this.from) * sampleRate))
    for (const chunk of this.chunks) {
      const offset = Math.round((chunk.startTime - this.from) * sampleRate)
      const skip = Math.max(0, -offset)
      const count = Math.min(chunk.samples.length - skip, out.length - Math.max(0, offset))
      if (count > 0) out.set(chunk.samples.subarray(skip, skip + count), Math.max(0, offset))
    }
    return out
  }

  /** Detected strums relative to the start of the WAV. */
  labelTimes(): number[] {
    return this.onsets.map((t) => t - this.from).sort((a, b) => a - b)
  }

  build(): { wav: Uint8Array<ArrayBuffer>; labels: string } {
    return {
      wav: encodeWav(this.samples(), this.sampleRate),
      labels: writeLabels(pointLabels(this.labelTimes())),
    }
  }
}

/** e.g. `fretwork-A-D-2026-09-29T10-15-00`, using local time. */
export function recordingFileBase(pair: ChordPair, date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  const chord = (c: string) => c.replace(/[^A-Za-z0-9]/g, '')
  return `fretwork-${chord(pair[0])}-${chord(pair[1])}-${stamp}`
}
