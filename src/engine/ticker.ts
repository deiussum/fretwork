/**
 * A repeating timer that decides when to schedule sounds, never when they
 * play. Injected so tests can drive it with fake timers and production can
 * run it in a worker that keeps ticking in background tabs.
 */
export interface Ticker {
  start(intervalMs: number, onTick: () => void): void
  stop(): void
}

/** Main-thread `setInterval` ticker. Throttled in background tabs. */
export class IntervalTicker implements Ticker {
  private handle: ReturnType<typeof setInterval> | undefined

  start(intervalMs: number, onTick: () => void): void {
    this.stop()
    this.handle = setInterval(onTick, intervalMs)
  }

  stop(): void {
    if (this.handle !== undefined) clearInterval(this.handle)
    this.handle = undefined
  }
}
