import { expect, test } from 'vitest'
import { InputRecorder } from './inputRecorder'
import { OnsetEmitter } from './onsetSource'

function fakeInput() {
  const chunkListeners = new Set<(c: { startTime: number; samples: Float32Array }) => void>()
  return {
    onsets: new OnsetEmitter(),
    capturing: [] as boolean[],
    setCapturing(capturing: boolean) {
      this.capturing.push(capturing)
    },
    onChunk(listener: (c: { startTime: number; samples: Float32Array }) => void) {
      chunkListeners.add(listener)
      return () => chunkListeners.delete(listener)
    },
    sendChunk(startTime: number, samples: Float32Array) {
      chunkListeners.forEach((l) => l({ startTime, samples }))
    },
    get chunkListenerCount() {
      return chunkListeners.size
    },
  }
}

test('captures chunks and onsets between begin and end, including the final flushed chunk', () => {
  const input = fakeInput()
  const recorder = new InputRecorder(input, () => 100)
  recorder.begin(1, 2)
  input.sendChunk(1, new Float32Array(50).fill(0.5))
  input.onsets.emit(1.25)
  recorder.end()
  input.sendChunk(1.5, new Float32Array(50).fill(0.25)) // flushed after stop
  expect(input.capturing).toEqual([false, true, false])
  const recording = recorder.current!
  expect(recording.samples()[10]).toBe(0.5)
  expect(recording.samples()[60]).toBe(0.25)
  expect(recording.labelTimes()).toEqual([0.25])
})

test('discard drops the recording and unsubscribes', () => {
  const input = fakeInput()
  const recorder = new InputRecorder(input, () => 100)
  recorder.begin(1, 2)
  recorder.discard()
  expect(recorder.current).toBeUndefined()
  expect(input.chunkListenerCount).toBe(0)
  expect(input.onsets.listenerCount).toBe(0)
})
