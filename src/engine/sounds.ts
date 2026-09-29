import type { Clock } from './clock'

export type SoundKind = 'click' | 'go' | 'end'

export interface SoundScheduler {
  /**
   * Make audio playable. Must be called from inside a user gesture handler so
   * browser autoplay rules allow it; resolves once the audio clock is running.
   */
  resume(): Promise<void>
  /** Play `kind` at absolute audio-clock time `at` (seconds). */
  schedule(kind: SoundKind, at: number): void
  /** Silence and discard everything scheduled that has not finished. */
  cancelAll(): void
}

type Tone = { freq: number; offset: number; duration: number }

const SOUNDS: Record<SoundKind, { tones: Tone[]; gain: number }> = {
  click: { tones: [{ freq: 1000, offset: 0, duration: 0.03 }], gain: 0.5 },
  go: { tones: [{ freq: 1500, offset: 0, duration: 0.08 }], gain: 0.9 },
  end: {
    tones: [
      { freq: 880, offset: 0, duration: 0.2 },
      { freq: 660, offset: 0.2, duration: 0.2 },
    ],
    gain: 0.7,
  },
}

/**
 * Synthesised sounds on a lazily created AudioContext. Also acts as the
 * session clock, since sounds must be scheduled against `currentTime`.
 */
export class WebAudioSounds implements SoundScheduler, Clock {
  private ctx: AudioContext | undefined
  private readonly active = new Set<OscillatorNode>()

  now(): number {
    return this.ctx?.currentTime ?? 0
  }

  async resume(): Promise<void> {
    this.ctx ??= new AudioContext()
    // Some browsers suspend an idle context, so resume on every start.
    if (this.ctx.state !== 'running') await this.ctx.resume()
  }

  schedule(kind: SoundKind, at: number): void {
    const ctx = this.ctx
    if (!ctx) throw new Error('resume() must be called before scheduling sounds')
    const { tones, gain } = SOUNDS[kind]
    for (const tone of tones) {
      const start = at + tone.offset
      const end = start + tone.duration
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = tone.freq
      env.gain.setValueAtTime(0, start)
      env.gain.linearRampToValueAtTime(gain, start + 0.002)
      env.gain.exponentialRampToValueAtTime(0.0001, end)
      osc.connect(env).connect(ctx.destination)
      osc.onended = () => {
        this.active.delete(osc)
        osc.disconnect()
        env.disconnect()
      }
      osc.start(start)
      osc.stop(end + 0.01)
      this.active.add(osc)
    }
  }

  cancelAll(): void {
    for (const osc of this.active) {
      osc.onended = null
      try {
        osc.stop()
      } catch {
        // Already stopped.
      }
      osc.disconnect()
    }
    this.active.clear()
  }
}

/** Test double that records what was scheduled. */
export class RecordingSounds implements SoundScheduler {
  scheduled: { kind: SoundKind; at: number }[] = []
  cancelCount = 0
  resumeCount = 0

  async resume(): Promise<void> {
    this.resumeCount++
  }

  schedule(kind: SoundKind, at: number): void {
    this.scheduled.push({ kind, at })
  }

  cancelAll(): void {
    this.scheduled = []
    this.cancelCount++
  }
}
