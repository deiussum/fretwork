/**
 * Dedicated worker that posts 'tick' at a fixed interval. Worker timers are
 * not throttled as hard as main-thread timers in background tabs.
 */
export type TickerCommand = { type: 'start'; intervalMs: number } | { type: 'stop' }

let handle: ReturnType<typeof setInterval> | undefined

self.onmessage = (e: MessageEvent<TickerCommand>) => {
  if (handle !== undefined) clearInterval(handle)
  handle = undefined
  if (e.data.type === 'start') handle = setInterval(() => self.postMessage('tick'), e.data.intervalMs)
}
