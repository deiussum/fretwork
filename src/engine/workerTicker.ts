import { IntervalTicker, type Ticker } from './ticker'
import type { TickerCommand } from './tickerWorker'

type WorkerLike = Pick<Worker, 'postMessage' | 'terminate'> & {
  onmessage: ((e: MessageEvent) => void) | null
  onerror: ((e: ErrorEvent) => void) | null
}

/**
 * Ticks from a dedicated worker so scheduling keeps up in background tabs.
 * Falls back to a main-thread interval if the worker can't be created or fails.
 */
export class WorkerTicker implements Ticker {
  private worker: WorkerLike | undefined
  private readonly fallback = new IntervalTicker()
  private failed = false
  private running: { intervalMs: number; onTick: () => void } | undefined

  constructor(createWorker: () => WorkerLike) {
    try {
      this.worker = createWorker()
      this.worker.onerror = () => this.fail('worker error')
    } catch (error) {
      this.fail(error)
    }
  }

  start(intervalMs: number, onTick: () => void): void {
    this.running = { intervalMs, onTick }
    if (this.failed || !this.worker) {
      this.fallback.start(intervalMs, onTick)
      return
    }
    this.worker.onmessage = () => this.running?.onTick()
    this.worker.postMessage({ type: 'start', intervalMs } satisfies TickerCommand)
  }

  stop(): void {
    this.running = undefined
    this.fallback.stop()
    if (this.worker && !this.failed) this.worker.postMessage({ type: 'stop' } satisfies TickerCommand)
  }

  private fail(reason: unknown) {
    if (this.failed) return
    this.failed = true
    console.warn('Metronome worker unavailable; timing may drift in background tabs.', reason)
    this.worker?.terminate()
    this.worker = undefined
    if (this.running) this.fallback.start(this.running.intervalMs, this.running.onTick)
  }
}
