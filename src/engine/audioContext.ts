import type { Clock } from './clock'

/**
 * Owns the single AudioContext shared by sounds and audio input, so that
 * scheduled sounds and detected strums share one clock. Created lazily on the
 * first `resume()`, which should run inside a user gesture.
 */
export class SharedAudioContext implements Clock {
  private ctx: AudioContext | undefined

  /** The context, if it has been created. */
  get current(): AudioContext | undefined {
    return this.ctx
  }

  now(): number {
    return this.ctx?.currentTime ?? 0
  }

  /**
   * The context, created if needed but not resumed. Before a user gesture it
   * may be suspended; call `resume()` from a gesture to start it.
   */
  ensure(): AudioContext {
    this.ctx ??= new AudioContext({ latencyHint: 'interactive' })
    return this.ctx
  }

  get running(): boolean {
    return this.ctx?.state === 'running'
  }

  async resume(): Promise<AudioContext> {
    const ctx = this.ensure()
    // Some browsers suspend an idle context, so resume on every use.
    if (ctx.state !== 'running') await ctx.resume()
    return ctx
  }
}
