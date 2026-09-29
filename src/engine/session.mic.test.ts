import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { MemoryHistory } from '../test/memoryHistory'
import { FakeClock } from './clock'
import { OnsetEmitter } from './input/onsetSource'
import { SessionEngine } from './session'
import { RecordingSounds } from './sounds'

// Clock starts at 100: first click 100.15, go 104.15, end 164.15.
const GO = 104.15
const END = 164.15

function setup() {
  const clock = new FakeClock(100)
  const history = new MemoryHistory()
  const source = new OnsetEmitter()
  const engine = new SessionEngine({ clock, sounds: new RecordingSounds(), history })
  const advanceTo = (t: number) => {
    const dt = t - clock.now()
    clock.advance(dt)
    vi.advanceTimersByTime(dt * 1000)
  }
  return { clock, history, source, engine, advanceTo }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Mic mode counting', () => {
  test('counts only strums from go + 0.15 s until the end', async () => {
    const { engine, source, advanceTo } = setup()
    await engine.start(['A', 'D'], { onsets: source })
    expect(engine.getState()).toMatchObject({ kind: 'countIn', count: 0 })

    advanceTo(101)
    source.emit(101) // test strum during count-in
    advanceTo(GO + 0.2)
    source.emit(GO + 0.1) // "go" bleed
    source.emit(GO + 0.2) // first real strum
    expect(engine.getState()).toMatchObject({ kind: 'running', count: 1 })

    advanceTo(END - 0.05)
    source.emit(END - 1)
    advanceTo(END + 0.05)
    // Still running during the grace period: a late-detected strum just before the end counts.
    expect(engine.getState().kind).toBe('running')
    source.emit(END - 0.05)
    source.emit(END + 0.05) // after the end: ignored
    expect(engine.getState()).toMatchObject({ kind: 'running', count: 3 })

    advanceTo(END + 0.2)
    expect(engine.getState()).toMatchObject({ kind: 'confirming', suggestedScore: 3 })
  })

  test('confirming carries the detected count and strum times after go, to the ms', async () => {
    const { engine, source, advanceTo } = setup()
    await engine.start(['A', 'D'], { onsets: source })
    advanceTo(GO + 1)
    source.emit(GO + 0.5004)
    source.emit(GO + 0.9876)
    advanceTo(END + 0.2)
    expect(engine.getState()).toEqual({
      kind: 'confirming',
      pair: ['A', 'D'],
      suggestedScore: 2,
      detection: { count: 2, onsets: [0.5, 0.988] },
    })
  })

  test('input lost during the run: no suggestion and an input-lost flag', async () => {
    const { engine, source, advanceTo } = setup()
    await engine.start(['A', 'D'], { onsets: source })
    advanceTo(GO + 30)
    source.emit(GO + 10)
    source.setStatus('lost')
    advanceTo(END + 0.2)
    expect(engine.getState()).toEqual({ kind: 'confirming', pair: ['A', 'D'], inputLost: true })
  })

  test('Manual mode still confirms exactly at the end with no count', async () => {
    const { engine, advanceTo } = setup()
    await engine.start(['A', 'D'])
    advanceTo(GO + 1)
    expect(engine.getState()).not.toHaveProperty('count')
    advanceTo(END)
    expect(engine.getState()).toEqual({ kind: 'confirming', pair: ['A', 'D'] })
  })
})

describe('saving Mic results', () => {
  test('saves method mic with detected count and strum times, even when edited', async () => {
    const { engine, source, history, advanceTo } = setup()
    await engine.start(['A', 'D'], { onsets: source })
    advanceTo(GO + 1)
    const times = Array.from({ length: 36 }, (_, i) => GO + 0.5 + i * 1.5)
    advanceTo(END - 1)
    times.forEach((t) => source.emit(t))
    advanceTo(END + 0.2)
    await engine.submitScore('34')
    expect(history.results[0]).toMatchObject({ method: 'mic', score: 34, detectedScore: 36 })
    expect(history.results[0].onsets).toHaveLength(36)
    expect(history.results[0].onsets?.[1]).toBe(2)
  })

  test('an input-lost run is saved as manual', async () => {
    const { engine, source, history, advanceTo } = setup()
    await engine.start(['A', 'D'], { onsets: source })
    source.setStatus('lost')
    advanceTo(END + 0.2)
    await engine.submitScore('20')
    expect(history.results[0]).toMatchObject({ method: 'manual', score: 20 })
    expect(history.results[0]).not.toHaveProperty('detectedScore')
  })

  test('manual results are unchanged', async () => {
    const { engine, history, advanceTo } = setup()
    await engine.start(['A', 'D'])
    advanceTo(END)
    await engine.submitScore('30')
    expect(history.results[0].method).toBe('manual')
    expect(history.results[0]).not.toHaveProperty('onsets')
  })
})

describe('unsubscribing', () => {
  test('abort unsubscribes; later onsets change nothing', async () => {
    const { engine, source, advanceTo } = setup()
    await engine.start(['A', 'D'], { onsets: source })
    advanceTo(GO + 5)
    engine.abort()
    expect(source.listenerCount).toBe(0)
    source.emit(GO + 6)
    expect(engine.getState()).toEqual({ kind: 'idle' })
  })

  test('confirming and dispose unsubscribe', async () => {
    const { engine, source, advanceTo } = setup()
    await engine.start(['A', 'D'], { onsets: source })
    advanceTo(END + 0.2)
    expect(source.listenerCount).toBe(0)

    engine.back()
    await engine.start(['A', 'D'], { onsets: source })
    expect(source.listenerCount).toBe(1)
    engine.dispose()
    expect(source.listenerCount).toBe(0)
  })
})

describe('recording', () => {
  function fakeRecorder() {
    const calls: string[] = []
    return {
      calls,
      begin: (from: number, to: number) => calls.push(`begin ${from.toFixed(2)} ${to.toFixed(2)}`),
      end: () => calls.push('end'),
      discard: () => calls.push('discard'),
    }
  }

  test('records from the first click to the end and marks the result as recorded', async () => {
    const { engine, source, advanceTo } = setup()
    const recorder = fakeRecorder()
    await engine.start(['A', 'D'], { onsets: source, recorder })
    expect(recorder.calls).toEqual(['begin 100.15 164.15'])
    advanceTo(END + 0.2)
    expect(recorder.calls).toEqual(['begin 100.15 164.15', 'end'])
    expect(engine.getState()).toMatchObject({ kind: 'confirming', recorded: true })
    await engine.submitScore('0')
    expect(engine.getState()).toMatchObject({ kind: 'result', recorded: true })
  })

  test('abort discards the recording', async () => {
    const { engine, source, advanceTo } = setup()
    const recorder = fakeRecorder()
    await engine.start(['A', 'D'], { onsets: source, recorder })
    advanceTo(GO + 3)
    engine.abort()
    expect(recorder.calls.at(-1)).toBe('discard')
  })

  test('the next session discards the previous recording even when not recording', async () => {
    const { engine, source, advanceTo } = setup()
    const recorder = fakeRecorder()
    await engine.start(['A', 'D'], { onsets: source, recorder })
    advanceTo(END + 0.2)
    engine.back()
    await engine.start(['A', 'D'], { onsets: source })
    expect(recorder.calls.at(-1)).toBe('discard')
    advanceTo(END + 100)
    expect(engine.getState()).not.toHaveProperty('recorded')
  })
})
