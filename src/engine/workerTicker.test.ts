import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { WorkerTicker } from './workerTicker'

class FakeWorker {
  posted: unknown[] = []
  terminated = false
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null
  postMessage(message: unknown) {
    this.posted.push(message)
  }
  terminate() {
    this.terminated = true
  }
  tick() {
    this.onmessage?.({ data: 'tick' } as MessageEvent)
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('starts and stops the worker and forwards its ticks', () => {
  const worker = new FakeWorker()
  const ticker = new WorkerTicker(() => worker)
  const onTick = vi.fn()
  ticker.start(25, onTick)
  expect(worker.posted).toEqual([{ type: 'start', intervalMs: 25 }])
  worker.tick()
  worker.tick()
  expect(onTick).toHaveBeenCalledTimes(2)
  ticker.stop()
  expect(worker.posted).toEqual([{ type: 'start', intervalMs: 25 }, { type: 'stop' }])
  worker.tick()
  expect(onTick).toHaveBeenCalledTimes(2)
})

test('falls back to a main-thread interval when the worker cannot be created', () => {
  const ticker = new WorkerTicker(() => {
    throw new Error('no workers')
  })
  const onTick = vi.fn()
  ticker.start(25, onTick)
  vi.advanceTimersByTime(100)
  expect(onTick).toHaveBeenCalledTimes(4)
  expect(console.warn).toHaveBeenCalled()
  ticker.stop()
  vi.advanceTimersByTime(100)
  expect(onTick).toHaveBeenCalledTimes(4)
})

test('switches to the fallback if the worker fails while running', () => {
  const worker = new FakeWorker()
  const ticker = new WorkerTicker(() => worker)
  const onTick = vi.fn()
  ticker.start(25, onTick)
  worker.onerror?.({} as ErrorEvent)
  expect(worker.terminated).toBe(true)
  vi.advanceTimersByTime(50)
  expect(onTick).toHaveBeenCalledTimes(2)
  ticker.stop()
})
