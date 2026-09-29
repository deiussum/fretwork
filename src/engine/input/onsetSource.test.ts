import { expect, test, vi } from 'vitest'
import { OnsetEmitter } from './onsetSource'

test('emitter delivers onsets and status changes to subscribers until unsubscribed', () => {
  const source = new OnsetEmitter()
  const onOnset = vi.fn()
  const onStatus = vi.fn()
  const unsubscribe = source.subscribe(onOnset)
  source.onStatus(onStatus)

  source.emit(12.5)
  source.setStatus('lost')
  expect(onOnset).toHaveBeenCalledWith(12.5)
  expect(onStatus).toHaveBeenCalledWith('lost')
  expect(source.status).toBe('lost')

  unsubscribe()
  source.emit(13)
  expect(onOnset).toHaveBeenCalledTimes(1)
  expect(source.listenerCount).toBe(0)
})
