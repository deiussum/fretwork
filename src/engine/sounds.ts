import type { SharedAudioContext } from './audioContext'

export type SoundKind = 'click' | 'go' | 'end' | 'tick' | 'accent'

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
  /** Discard sounds scheduled to start at or after `time`; earlier ones play on. */
  cancelFrom(time: number): void
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
  tick: { tones: [{ freq: 1200, offset: 0, duration: 0.03 }], gain: 0.5 },
  accent: { tones: [{ freq: 1800, offset: 0, duration: 0.04 }], gain: 0.85 },
}

/** Synthesised sounds on the shared AudioContext. */
export class WebAudioSounds implements SoundScheduler {
  /** Oscillators that have not ended, with their start times. */
  private readonly active = new Map<OscillatorNode, number>()
  private readonly audio: SharedAudioContext

  constructor(audio: SharedAudioContext) {
    this.audio = audio
  }

  async resume(): Promise<void> {
    await this.audio.resume()
  }

  schedule(kind: SoundKind, at: number): void {
    const ctx = this.audio.current
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
      this.active.set(osc, start)
    }
  }

  cancelAll(): void {
    for (const osc of this.active.keys()) this.silence(osc)
    this.active.clear()
  }

  cancelFrom(time: number): void {
    for (const [osc, start] of this.active) {
      if (start < time) continue
      this.silence(osc)
      this.active.delete(osc)
    }
  }

  private silence(osc: OscillatorNode) {
    osc.onended = null
    try {
      osc.stop()
    } catch {
      // Already stopped.
    }
    osc.disconnect()
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

  cancelFrom(time: number): void {
    this.scheduled = this.scheduled.filter((s) => s.at < time)
  }
}
