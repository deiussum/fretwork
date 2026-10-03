import { expect, test } from 'vitest'
import { FakeClock } from './clock'
import type { SharedAudioContext } from './audioContext'
import { RecordingSounds, WebAudioSounds } from './sounds'

test('fake clock advances deterministically', () => {
  const clock = new FakeClock(10)
  expect(clock.now()).toBe(10)
  clock.advance(1.5)
  clock.advance(0.25)
  expect(clock.now()).toBe(11.75)
})

test('recording scheduler records schedule times and cancellation', async () => {
  const sounds = new RecordingSounds()
  await sounds.resume()
  sounds.schedule('click', 1)
  sounds.schedule('go', 5)
  expect(sounds.scheduled).toEqual([
    { kind: 'click', at: 1 },
    { kind: 'go', at: 5 },
  ])
  sounds.cancelAll()
  expect(sounds.scheduled).toEqual([])
  expect(sounds.cancelCount).toBe(1)
  expect(sounds.resumeCount).toBe(1)
})

test('recording scheduler records metronome sounds and cancels from a time', () => {
  const sounds = new RecordingSounds()
  sounds.schedule('accent', 1)
  sounds.schedule('tick', 1.5)
  sounds.schedule('tick', 2)
  sounds.cancelFrom(1.5)
  expect(sounds.scheduled).toEqual([{ kind: 'accent', at: 1 }])
})

/** Minimal AudioContext stand-in that tracks oscillator start and stop calls. */
function fakeAudio() {
  const oscillators: { startAt: number; stopped: number[]; frequency: { value: number } }[] = []
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} })
  const node = () => ({ connect: (n: unknown) => n, disconnect() {} })
  const ctx = {
    destination: {},
    createGain: () => ({ ...node(), gain: param() }),
    createOscillator: () => {
      const frequency = param()
      const record = { startAt: Number.NaN, stopped: [] as number[], frequency }
      oscillators.push(record)
      return {
        ...node(),
        type: 'sine',
        frequency,
        onended: null,
        start: (t: number) => (record.startAt = t),
        stop: (t = 0) => record.stopped.push(t),
      }
    },
  }
  const audio = { current: ctx } as unknown as SharedAudioContext
  return { audio, oscillators }
}

test('web audio cancelFrom stops only sounds starting at or after the time', () => {
  const { audio, oscillators } = fakeAudio()
  const sounds = new WebAudioSounds(audio)
  sounds.schedule('accent', 1)
  sounds.schedule('tick', 1.5)
  sounds.schedule('tick', 2)
  // Each scheduled tone calls stop once for its natural end.
  expect(oscillators.map((o) => o.stopped.length)).toEqual([1, 1, 1])
  sounds.cancelFrom(1.5)
  expect(oscillators.map((o) => o.stopped.length)).toEqual([1, 2, 2])
  sounds.cancelAll()
  expect(oscillators.map((o) => o.stopped.length)).toEqual([2, 2, 2])
})

test('strumming guide: up is higher than down, accents share the pitch, chuck is lowest', () => {
  const { audio, oscillators } = fakeAudio()
  const sounds = new WebAudioSounds(audio)
  for (const kind of ['strumDown', 'strumUp', 'strumDownAccent', 'strumUpAccent', 'chuck', 'tick'] as const) {
    sounds.schedule(kind, 1)
  }
  const [down, up, downAccent, upAccent, chuck, click] = oscillators.map((o) => o.frequency.value)
  expect(up).toBeGreaterThan(down)
  expect(downAccent).toBe(down)
  expect(upAccent).toBe(up)
  expect(chuck).toBeLessThan(down)
  expect(new Set([down, up, chuck, click]).size).toBe(4)
})
