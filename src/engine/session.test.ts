import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { MemoryHistory } from '../test/memoryHistory'
import { FakeClock } from './clock'
import { SessionEngine, parseScore } from './session'
import { RecordingSounds } from './sounds'

function setup() {
  const clock = new FakeClock(100)
  const sounds = new RecordingSounds()
  const history = new MemoryHistory()
  let n = 0
  const engine = new SessionEngine({
    clock,
    sounds,
    history,
    newId: () => `id-${++n}`,
    timestamp: () => `2026-09-28T10:00:0${n}Z`,
  })
  /** Advance both the audio clock and the poll timer. */
  const advance = (seconds: number) => {
    clock.advance(seconds)
    vi.advanceTimersByTime(seconds * 1000)
  }
  return { clock, sounds, history, engine, advance }
}

/** Run a full session through to confirming. */
async function runToConfirming(ctx: ReturnType<typeof setup>, pair: [string, string] = ['A', 'D']) {
  await ctx.engine.start(pair)
  ctx.advance(0.15 + 4 + 60)
  expect(ctx.engine.getState().kind).toBe('confirming')
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('initial state', () => {
  test('starts idle and notifies subscribers on change', async () => {
    const { engine } = setup()
    expect(engine.getState()).toEqual({ kind: 'idle' })
    const listener = vi.fn()
    const unsubscribe = engine.subscribe(listener)
    await engine.start(['A', 'D'])
    expect(listener).toHaveBeenCalled()
    unsubscribe()
    listener.mockClear()
    engine.abort()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('start', () => {
  test('resumes audio and schedules 4 clicks, go and end at exact times', async () => {
    const { engine, sounds } = setup()
    await engine.start(['A', 'D'])
    expect(sounds.resumeCount).toBe(1)
    const t0 = 100.15
    const expected = [
      { kind: 'click', at: t0 },
      { kind: 'click', at: t0 + 1 },
      { kind: 'click', at: t0 + 2 },
      { kind: 'click', at: t0 + 3 },
      { kind: 'go', at: t0 + 4 },
      { kind: 'end', at: t0 + 64 },
    ]
    expect(sounds.scheduled.map((s) => s.kind)).toEqual(expected.map((s) => s.kind))
    sounds.scheduled.forEach((s, i) => expect(s.at).toBeCloseTo(expected[i].at, 9))
    expect(engine.getState()).toMatchObject({ kind: 'countIn', pair: ['A', 'D'] })
  })

  test('transitions countIn → running at goTime → confirming at endTime', async () => {
    const ctx = setup()
    await ctx.engine.start(['A', 'D'])
    ctx.advance(4.1)
    expect(ctx.engine.getState().kind).toBe('countIn')
    ctx.advance(0.1)
    expect(ctx.engine.getState()).toMatchObject({ kind: 'running', pair: ['A', 'D'] })
    ctx.advance(59.9)
    expect(ctx.engine.getState().kind).toBe('running')
    ctx.advance(0.1)
    expect(ctx.engine.getState()).toMatchObject({ kind: 'confirming', pair: ['A', 'D'] })
  })

  test('remembers the pair as the last practised pair', async () => {
    const { engine, history } = setup()
    await engine.start(['C', 'G'])
    expect(history.lastPair).toEqual(['C', 'G'])
  })

  test('is ignored during countIn and running', async () => {
    const ctx = setup()
    await ctx.engine.start(['A', 'D'])
    const countIn = ctx.engine.getState()
    await ctx.engine.start(['C', 'G'])
    expect(ctx.engine.getState()).toBe(countIn)

    ctx.advance(5)
    const running = ctx.engine.getState()
    expect(running.kind).toBe('running')
    await ctx.engine.start(['C', 'G'])
    expect(ctx.engine.getState()).toBe(running)
    expect(ctx.sounds.scheduled).toHaveLength(6)
    expect(ctx.sounds.resumeCount).toBe(1)
  })
})

describe('abort', () => {
  test('during the run cancels sounds, returns idle and saves nothing', async () => {
    const ctx = setup()
    await ctx.engine.start(['A', 'D'])
    ctx.advance(24)
    ctx.engine.abort()
    expect(ctx.sounds.cancelCount).toBe(1)
    expect(ctx.sounds.scheduled).toEqual([])
    expect(ctx.engine.getState()).toEqual({ kind: 'idle' })
    ctx.advance(60)
    expect(ctx.engine.getState()).toEqual({ kind: 'idle' })
    expect(ctx.history.results).toEqual([])
  })

  test('during the count-in cancels the remaining sounds', async () => {
    const ctx = setup()
    await ctx.engine.start(['A', 'D'])
    ctx.advance(1.5)
    ctx.engine.abort()
    expect(ctx.sounds.cancelCount).toBe(1)
    expect(ctx.engine.getState()).toEqual({ kind: 'idle' })
  })

  test('before audio has resumed prevents the session from starting', async () => {
    const ctx = setup()
    const pending = ctx.engine.start(['A', 'D'])
    ctx.engine.abort()
    await pending
    expect(ctx.engine.getState()).toEqual({ kind: 'idle' })
    expect(ctx.sounds.scheduled).toEqual([])
  })
})

describe('score confirmation', () => {
  test('a valid score is saved as a manual result and the result is shown', async () => {
    const ctx = setup()
    await runToConfirming(ctx)
    await ctx.engine.submitScore('34')
    expect(ctx.history.results).toEqual([
      {
        id: 'id-1',
        pairKey: 'A|D',
        chords: ['A', 'D'],
        score: 34,
        durationSec: 60,
        at: '2026-09-28T10:00:01Z',
        method: 'manual',
      },
    ])
    expect(ctx.engine.getState()).toEqual({
      kind: 'result',
      pair: ['A', 'D'],
      score: 34,
      previous: undefined,
      best: undefined,
      isNewBest: true,
    })
  })

  test('result shows previous and best from before this attempt', async () => {
    const ctx = setup()
    await runToConfirming(ctx)
    await ctx.engine.submitScore(30)
    await runToConfirming(ctx, ['D', 'A'])
    await ctx.engine.submitScore(28)
    expect(ctx.engine.getState()).toMatchObject({ score: 28, previous: 30, best: 30, isNewBest: false })

    await runToConfirming(ctx)
    await ctx.engine.submitScore(34)
    expect(ctx.engine.getState()).toMatchObject({ score: 34, previous: 28, best: 30, isNewBest: true })
  })

  test.each(['-3', '1000', 'abc', '', '3.5'])('invalid input %j is rejected', async (input) => {
    const ctx = setup()
    await runToConfirming(ctx)
    await ctx.engine.submitScore(input)
    expect(ctx.history.results).toEqual([])
    expect(ctx.engine.getState()).toMatchObject({
      kind: 'confirming',
      error: 'Enter a whole number from 0 to 999.',
    })
  })

  test('back discards the attempt without saving', async () => {
    const ctx = setup()
    await runToConfirming(ctx)
    ctx.engine.back()
    expect(ctx.engine.getState()).toEqual({ kind: 'idle' })
    expect(ctx.history.results).toEqual([])
  })

  test('a suggested score is exposed while confirming', async () => {
    const ctx = setup()
    await runToConfirming(ctx)
    ctx.engine.suggestScore(36)
    expect(ctx.engine.getState()).toMatchObject({ kind: 'confirming', suggestedScore: 36 })
  })
})

describe('result', () => {
  test('start from result begins a new count-in', async () => {
    const ctx = setup()
    await runToConfirming(ctx)
    await ctx.engine.submitScore(30)
    await ctx.engine.start(['A', 'D'])
    expect(ctx.engine.getState().kind).toBe('countIn')
  })

  test('back returns to idle', async () => {
    const ctx = setup()
    await runToConfirming(ctx)
    await ctx.engine.submitScore(30)
    ctx.engine.back()
    expect(ctx.engine.getState()).toEqual({ kind: 'idle' })
  })
})

test('parseScore accepts whole numbers 0–999 only', () => {
  expect(parseScore('0')).toBe(0)
  expect(parseScore(' 42 ')).toBe(42)
  expect(parseScore(999)).toBe(999)
  expect(parseScore('1000')).toBeUndefined()
  expect(parseScore('-1')).toBeUndefined()
  expect(parseScore('1e2')).toBeUndefined()
})
