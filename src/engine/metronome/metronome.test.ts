import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DEFAULT_METRONOME_SETTINGS, type MetronomeSettings } from '../../domain/metronomeSettings'
import { FakeClock } from '../clock'
import { RecordingSounds } from '../sounds'
import { IntervalTicker } from '../ticker'
import { MetronomeEngine, type VisibilitySource } from './metronome'
import { tempoForBar } from './ramp'

class FakeVisibility implements VisibilitySource {
  isHidden = false
  private readonly listeners = new Set<() => void>()
  hidden() {
    return this.isHidden
  }
  onChange(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  set(hidden: boolean) {
    this.isHidden = hidden
    for (const l of this.listeners) l()
  }
}

const T0 = 100

function setup(settings: Partial<MetronomeSettings> = {}) {
  const clock = new FakeClock(T0)
  const sounds = new RecordingSounds()
  const visibility = new FakeVisibility()
  const engine = new MetronomeEngine({
    clock,
    sounds,
    ticker: new IntervalTicker(),
    visibility,
    settings: { ...DEFAULT_METRONOME_SETTINGS, ...settings },
  })
  /** Advance the audio clock and the ticker together, one tick at a time. */
  const advance = (seconds: number) => {
    const steps = Math.round(seconds / 0.025)
    for (let i = 0; i < steps; i++) {
      clock.advance(0.025)
      vi.advanceTimersByTime(25)
    }
  }
  const times = () => sounds.scheduled.map((s) => s.at)
  const kinds = () => sounds.scheduled.map((s) => s.kind)
  return { clock, sounds, visibility, engine, advance, times, kinds }
}

/** Expected click times for consecutive beats at the given tempos. */
function cumulative(start: number, bpms: number[]): number[] {
  const out: number[] = []
  let t = start
  for (const bpm of bpms) {
    out.push(t)
    t += 60 / bpm
  }
  return out
}

function expectTimes(actual: number[], expected: number[]) {
  expect(actual.length).toBe(expected.length)
  actual.forEach((t, i) => expect(t).toBeCloseTo(expected[i], 9))
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('start and stop', () => {
  test('first click is an accent within 200 ms, then clicks every 0.5 s at 120 BPM', async () => {
    const ctx = setup({ bpm: 120 })
    await ctx.engine.start()
    expect(ctx.sounds.resumeCount).toBe(1)
    expect(ctx.engine.getState().playing).toBe(true)
    expect(ctx.sounds.scheduled[0]).toEqual({ kind: 'accent', at: T0 + 0.05 })
    ctx.advance(4.5)
    const first9 = ctx.times().slice(0, 9)
    expectTimes(first9, cumulative(T0 + 0.05, Array(9).fill(120)))
  })

  test('schedules only a short way ahead while visible', async () => {
    const ctx = setup({ bpm: 120 })
    await ctx.engine.start()
    ctx.advance(2)
    expect(Math.max(...ctx.times())).toBeLessThan(ctx.clock.now() + 0.1 + 0.5)
  })

  test('stop silences everything not yet played and schedules nothing more', async () => {
    const ctx = setup()
    await ctx.engine.start()
    ctx.advance(1)
    ctx.engine.stop()
    expect(ctx.sounds.cancelCount).toBe(1)
    expect(ctx.engine.getState().playing).toBe(false)
    ctx.advance(2)
    expect(ctx.sounds.scheduled).toEqual([])
  })

  test('stop while audio is still resuming prevents the start', async () => {
    const ctx = setup()
    const starting = ctx.engine.start()
    ctx.engine.stop()
    await starting
    expect(ctx.engine.getState().playing).toBe(false)
    ctx.advance(1)
    expect(ctx.sounds.scheduled).toEqual([])
  })

  test('toggle starts and stops', async () => {
    const ctx = setup()
    ctx.engine.toggle()
    await vi.waitFor(() => expect(ctx.engine.getState().playing).toBe(true))
    ctx.engine.toggle()
    expect(ctx.engine.getState().playing).toBe(false)
  })
})

describe('accents', () => {
  test('3 beats per bar: accent, tick, tick, accent…', async () => {
    const ctx = setup({ bpm: 120, beatsPerBar: 3 })
    await ctx.engine.start()
    ctx.advance(3)
    expect(ctx.kinds().slice(0, 7)).toEqual(['accent', 'tick', 'tick', 'accent', 'tick', 'tick', 'accent'])
  })

  test('1 beat per bar has no accent', async () => {
    const ctx = setup({ bpm: 120, beatsPerBar: 1 })
    await ctx.engine.start()
    ctx.advance(2)
    expect(new Set(ctx.kinds())).toEqual(new Set(['tick']))
  })
})

describe('live changes', () => {
  test('a tempo change keeps the next click and spaces later clicks at the new tempo', async () => {
    const ctx = setup({ bpm: 100 })
    await ctx.engine.start()
    // Beats at 0.05, 0.65, 1.25; change between the 2nd and 3rd.
    ctx.advance(1.2)
    ctx.engine.setTempo(110)
    ctx.advance(3)
    const expected = cumulative(T0 + 0.05, [100, 100, 110, 110, 110, 110, 110])
    expectTimes(ctx.times().slice(0, 7), expected)
    // No gap or double click: strictly increasing and nothing extra between.
    const all = ctx.times()
    for (let i = 1; i < all.length; i++) expect(all[i] - all[i - 1]).toBeGreaterThan(0.5)
  })

  test('tempo is clamped to 30–300 and nudges move it by the given amount', () => {
    const ctx = setup({ bpm: 298 })
    ctx.engine.nudgeTempo(5)
    expect(ctx.engine.getState().settings.bpm).toBe(300)
    ctx.engine.setTempo(10)
    expect(ctx.engine.getState().settings.bpm).toBe(30)
  })

  test('changing 4 to 3 beats per bar on beat 2 finishes the current bar with 4', async () => {
    const ctx = setup({ bpm: 120, beatsPerBar: 4 })
    await ctx.engine.start()
    ctx.advance(0.5) // beat 2 of bar 0 has sounded
    ctx.engine.setBeatsPerBar(3)
    ctx.advance(5)
    expect(ctx.kinds().slice(0, 11)).toEqual([
      'accent', 'tick', 'tick', 'tick',
      'accent', 'tick', 'tick',
      'accent', 'tick', 'tick',
      'accent',
    ])
  })

  test('beats per bar is limited to 1–12', () => {
    const ctx = setup()
    ctx.engine.setBeatsPerBar(13)
    expect(ctx.engine.getState().settings.beatsPerBar).toBe(12)
    ctx.engine.setBeatsPerBar(0)
    expect(ctx.engine.getState().settings.beatsPerBar).toBe(1)
  })
})

describe('speed trainer', () => {
  const trainer = { start: 95, step: 5, every: 4, target: 120 }

  test('bars follow the ramp and hold at the target', async () => {
    const ctx = setup({ trainerOn: true, trainer, beatsPerBar: 4 })
    await ctx.engine.start()
    ctx.advance(60)
    const bpms = Array.from({ length: 22 * 4 }, (_, i) => tempoForBar(Math.floor(i / 4), trainer))
    expectTimes(ctx.times().slice(0, bpms.length), cumulative(T0 + 0.05, bpms))
  })

  test('the displayed tempo is the trainer start while stopped', () => {
    const ctx = setup({ trainerOn: true, trainer, bpm: 150 })
    expect(ctx.engine.currentTempo()).toBe(95)
  })

  test('restarting begins at the start tempo again', async () => {
    const ctx = setup({ trainerOn: true, trainer })
    await ctx.engine.start()
    ctx.advance(30)
    expect(ctx.engine.currentTempo()).toBeGreaterThan(95)
    ctx.engine.stop()
    await ctx.engine.start()
    ctx.advance(0.1)
    expect(ctx.engine.position(ctx.clock.now())).toMatchObject({ bar: 0, bpm: 95 })
  })

  test('invalid settings refuse to start', async () => {
    const ctx = setup({ trainerOn: true, trainer: { ...trainer, target: 90 } })
    expect(ctx.engine.canStart()).toBe(false)
    await ctx.engine.start()
    expect(ctx.engine.getState().playing).toBe(false)
    expect(ctx.sounds.resumeCount).toBe(0)
  })

  test('Shift+Down mid-ramp shifts the ramp and keeps the bar count', async () => {
    const ctx = setup({ trainerOn: true, trainer, beatsPerBar: 4 })
    await ctx.engine.start()
    // Bars 12–15 play at 110; wait until bar 12 has started.
    const bar12 = cumulative(T0 + 0.05, Array.from({ length: 49 }, (_, i) => tempoForBar(Math.floor(i / 4), trainer)))[48]
    ctx.advance(bar12 - T0 + 0.05)
    expect(ctx.engine.position(ctx.clock.now())).toMatchObject({ bar: 12, bpm: 110 })
    ctx.engine.nudgeTempo(-5)
    expect(ctx.engine.getState().settings.trainer).toEqual({ ...trainer, start: 90, target: 115 })
    expect(ctx.engine.currentTempo()).toBe(105)
    ctx.advance(2.4) // through bar 12 into bar 13
    expect(ctx.engine.position(ctx.clock.now())).toMatchObject({ bar: 13, bpm: 105 })
  })

  test('tap tempo with the trainer on shifts the ramp to the tapped tempo', () => {
    const ctx = setup({ trainerOn: true, trainer })
    ctx.engine.setTempo(100)
    expect(ctx.engine.getState().settings.trainer).toEqual({ ...trainer, start: 100, target: 125 })
  })

  test('the shift is limited at 300', () => {
    const ctx = setup({ trainerOn: true, trainer: { start: 260, step: 5, every: 4, target: 298 } })
    ctx.engine.nudgeTempo(5)
    expect(ctx.engine.getState().settings.trainer).toMatchObject({ start: 262, target: 300 })
  })

  test('trainer settings and toggle are ignored while playing', async () => {
    const ctx = setup({ trainerOn: true, trainer })
    await ctx.engine.start()
    ctx.engine.setTrainerOn(false)
    ctx.engine.setTrainer({ ...trainer, step: 10 })
    expect(ctx.engine.getState().settings).toMatchObject({ trainerOn: true, trainer })
    ctx.engine.stop()
    ctx.engine.setTrainer({ ...trainer, step: 10 })
    ctx.engine.setTrainerOn(false)
    expect(ctx.engine.getState().settings).toMatchObject({ trainerOn: false, trainer: { ...trainer, step: 10 } })
  })

  test('position reports bars until the next step and reaching the target', async () => {
    const ctx = setup({ trainerOn: true, trainer: { start: 100, step: 10, every: 4, target: 110 }, beatsPerBar: 1 })
    await ctx.engine.start()
    ctx.advance(0.06)
    expect(ctx.engine.position(ctx.clock.now())).toMatchObject({ bar: 0, nextStepIn: 4, atTarget: false })
    ctx.advance(1.2) // bars 1 and 2 at 0.6 s each
    expect(ctx.engine.position(ctx.clock.now())).toMatchObject({ bar: 2, nextStepIn: 2 })
    ctx.advance(1.2)
    expect(ctx.engine.position(ctx.clock.now())).toMatchObject({ bar: 4, bpm: 110, nextStepIn: undefined, atTarget: true })
  })
})

describe('position', () => {
  test('undefined before the first click and when stopped', async () => {
    const ctx = setup({ bpm: 120 })
    expect(ctx.engine.position(ctx.clock.now())).toBeUndefined()
    await ctx.engine.start()
    expect(ctx.engine.position(ctx.clock.now())).toBeUndefined()
    ctx.advance(0.05)
    expect(ctx.engine.position(ctx.clock.now())).toMatchObject({ bar: 0, beatInBar: 0, beatsPerBar: 4, bpm: 120 })
    ctx.advance(1.0)
    expect(ctx.engine.position(ctx.clock.now())).toMatchObject({ bar: 0, beatInBar: 2 })
    ctx.engine.stop()
    expect(ctx.engine.position(ctx.clock.now())).toBeUndefined()
  })
})

describe('background tabs', () => {
  test('schedules 1.5 s ahead while hidden, without double-scheduling when visible again', async () => {
    const ctx = setup({ bpm: 120 })
    await ctx.engine.start()
    ctx.advance(1)
    ctx.visibility.set(true)
    expect(Math.max(...ctx.times())).toBeGreaterThan(ctx.clock.now() + 1)
    ctx.advance(5)
    ctx.visibility.set(false)
    ctx.advance(5)
    expectTimes(ctx.times(), cumulative(T0 + 0.05, Array(ctx.times().length).fill(120)))
  })

  test('a tempo change after a hidden period applies from the next click', async () => {
    const ctx = setup({ bpm: 120 })
    await ctx.engine.start()
    ctx.visibility.set(true)
    ctx.advance(0.3) // beat 0 at 0.05 has sounded; scheduled up to ~1.8 s
    ctx.visibility.set(false)
    ctx.engine.setTempo(60)
    ctx.advance(3)
    expectTimes(ctx.times().slice(0, 4), cumulative(T0 + 0.05, [120, 60, 60, 60]))
  })
})

test('beatAt returns the same object while a beat is current', async () => {
  const ctx = setup({ bpm: 60 })
  await ctx.engine.start()
  ctx.advance(0.1)
  const beat = ctx.engine.beatAt(ctx.clock.now())
  ctx.advance(0.5)
  expect(ctx.engine.beatAt(ctx.clock.now())).toBe(beat)
  ctx.advance(0.5)
  expect(ctx.engine.beatAt(ctx.clock.now())).not.toBe(beat)
})
