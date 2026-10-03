import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DEFAULT_METRONOME_SETTINGS } from '../../domain/metronomeSettings'
import { parseSlots, type Pattern } from '../../domain/strumming'
import { PRESET_PATTERNS } from '../../domain/strummingPresets'
import type { SoundChoice } from '../../domain/strummingSettings'
import { FakeVisibility } from '../../test/fakeVisibility'
import { FakeClock } from '../clock'
import { RecordingSounds } from '../sounds'
import { IntervalTicker } from '../ticker'
import { StrummingEngine } from './strumming'

const T0 = 100
/** The metronome's delay before the first click. */
const LEAD = 0.05

const preset = (name: string) => PRESET_PATTERNS.find((p) => p.name === name)!
const oldFaithful = preset('Old faithful')
const downUps = preset('Down-ups')

const straight = (slots: string, beatsPerBar = 4): Pattern => ({
  id: slots,
  name: slots,
  beatsPerBar,
  subdivision: 2,
  swing: 0,
  slots: parseSlots(slots),
})

function setup(pattern: Pattern, options: { bpm?: number; sound?: SoundChoice; trainer?: boolean } = {}) {
  const clock = new FakeClock(T0)
  const sounds = new RecordingSounds()
  const guide = new RecordingSounds()
  const visibility = new FakeVisibility()
  const { trainer } = DEFAULT_METRONOME_SETTINGS
  const engine = new StrummingEngine({
    clock,
    sounds,
    guide,
    ticker: new IntervalTicker(),
    visibility,
    pattern,
    sound: options.sound,
    tempo: {
      bpm: options.bpm ?? 120,
      trainerOn: options.trainer ?? false,
      trainer: options.trainer ? { start: 60, step: 5, every: 4, target: 80 } : trainer,
    },
  })
  const advance = (seconds: number) => {
    const steps = Math.round(seconds / 0.025)
    for (let i = 0; i < steps; i++) {
      clock.advance(0.025)
      vi.advanceTimersByTime(25)
    }
  }
  /** Guide sounds as [kind, seconds after `from`]. */
  const guideFrom = (from: number, to = Infinity) =>
    guide.scheduled.filter((s) => s.at >= from - 1e-9 && s.at < to - 1e-9).map((s) => [s.kind, round(s.at - from)])
  return { clock, sounds, guide, visibility, engine, advance, guideFrom }
}

const round = (t: number) => Math.round(t * 1000) / 1000

const OLD_FAITHFUL_GUIDE = [
  ['strumDown', 0],
  ['strumDown', 0.5],
  ['strumUp', 0.75],
  ['strumUp', 1.25],
  ['strumDown', 1.5],
  ['strumUp', 1.75],
]

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('playback', () => {
  test('count-in: four clicks 1 s apart at 60 BPM, then the pattern on the next beat', async () => {
    const { engine, sounds, guide, advance } = setup(oldFaithful, { bpm: 60 })
    await engine.start()
    advance(4.5)
    const clicks = sounds.scheduled.map((s) => [s.kind, round(s.at - T0)])
    expect(clicks.slice(0, 5)).toEqual([
      ['accent', LEAD],
      ['tick', 1 + LEAD],
      ['tick', 2 + LEAD],
      ['tick', 3 + LEAD],
      ['accent', 4 + LEAD],
    ])
    expect(guide.scheduled.every((s) => s.at >= T0 + 4 + LEAD)).toBe(true)
    expect(guide.scheduled[0]).toEqual({ kind: 'strumDown', at: T0 + 4 + LEAD })
  })

  test('Old faithful guide at 120 BPM', async () => {
    const { engine, advance, guideFrom } = setup(oldFaithful)
    await engine.start()
    advance(6.5)
    const bar1 = T0 + LEAD + 2
    expect(guideFrom(bar1, bar1 + 2)).toEqual(OLD_FAITHFUL_GUIDE)
    expect(guideFrom(bar1 + 2, bar1 + 4)).toEqual(OLD_FAITHFUL_GUIDE)
  })

  test('accents and chucks use their own sounds', async () => {
    const { engine, advance, guideFrom } = setup(straight('>c.x....'))
    await engine.start()
    advance(4.5)
    expect(guideFrom(T0 + LEAD + 2, T0 + LEAD + 4)).toEqual([
      ['strumDownAccent', 0],
      ['chuck', 0.25],
      ['strumUp', 0.75],
    ])
  })

  test('expected strokes with the click only', async () => {
    const { engine, guide, advance } = setup(oldFaithful, { sound: 'click' })
    await engine.start()
    advance(3.9)
    const bar1 = T0 + LEAD + 2
    expect(guide.scheduled).toEqual([])
    const strokes = engine.expectedStrokes().filter((s) => s.bar === 1)
    expect(strokes.map((s) => round(s.time - bar1))).toEqual([0, 0.5, 0.75, 1.25, 1.5, 1.75])
    expect(strokes.map((s) => s.direction)).toEqual(['down', 'down', 'up', 'up', 'down', 'up'])
  })

  test('old expected strokes are dropped after a few seconds', async () => {
    const { engine, clock, advance } = setup(oldFaithful)
    await engine.start()
    advance(12)
    const oldest = engine.expectedStrokes()[0]
    expect(oldest.time).toBeGreaterThanOrEqual(clock.now() - 5)
  })

  test('a two-bar pattern repeats every two bars', async () => {
    const { engine, advance, guideFrom } = setup(straight('x.......|xxxxxxxx'))
    await engine.start()
    advance(8.5)
    const bar = (n: number) => T0 + LEAD + 2 * n
    expect(guideFrom(bar(1), bar(2))).toHaveLength(1)
    expect(guideFrom(bar(2), bar(3))).toHaveLength(8)
    expect(guideFrom(bar(3), bar(4))).toHaveLength(1)
  })

  test('position: count-in, then slot and bar of the pattern', async () => {
    const { engine, clock, advance } = setup(straight('x.......|xxxxxxxx'))
    await engine.start()
    advance(1)
    expect(engine.position(clock.now())).toMatchObject({ countIn: true })
    advance(1.05 + 2 + 1.3) // bar 2, 1.3 s in: beat 3, the & (slot 5)
    expect(engine.position(clock.now())).toMatchObject({ countIn: false, slot: 5, barInPattern: 1 })
    const at = engine.position(clock.now())
    expect(engine.position(clock.now())).toBe(at)
    engine.stop()
    expect(engine.position(clock.now())).toBeUndefined()
  })

  test('stop silences clicks and guide sounds that have not sounded', async () => {
    const { engine, sounds, guide, clock, visibility, advance } = setup(oldFaithful)
    await engine.start()
    visibility.set(true)
    advance(2.5)
    engine.stop()
    expect(engine.getState().playing).toBe(false)
    expect(sounds.scheduled.every((s) => s.at <= clock.now())).toBe(true)
    expect(guide.scheduled).toEqual([])
  })
})

describe('live changes', () => {
  test('switching pattern on beat 2 plays the rest of the bar, then the new pattern', async () => {
    const { engine, advance, guideFrom } = setup(oldFaithful)
    await engine.start()
    const bar1 = T0 + LEAD + 2
    advance(2 + 0.6) // beat 2 of bar 1
    engine.setPattern(downUps)
    advance(3)
    expect(guideFrom(bar1, bar1 + 2)).toEqual(OLD_FAITHFUL_GUIDE)
    expect(guideFrom(bar1 + 2, bar1 + 4)).toHaveLength(8)
  })

  test('a switch reaches a next bar already scheduled in a hidden tab, with its own beats per bar', async () => {
    const { engine, sounds, visibility, advance, guideFrom } = setup(straight('x.xx.xxx|xxxxxxxx'))
    await engine.start()
    visibility.set(true)
    advance(2 + 1.3) // bar 1, beat 3; bar 2 is already scheduled
    engine.setPattern(straight('>.x.x.', 3))
    advance(4)
    const bar2 = T0 + LEAD + 4
    expect(guideFrom(bar2, bar2 + 1.5)).toEqual([
      ['strumDownAccent', 0],
      ['strumDown', 0.5],
      ['strumDown', 1],
    ])
    // Bar 3 starts after three beats with the pattern's first bar again.
    expect(guideFrom(bar2 + 1.5, bar2 + 1.6)).toEqual([['strumDownAccent', 0]])
    const accents = sounds.scheduled.filter((s) => s.kind === 'accent').map((s) => round(s.at - T0))
    expect(accents).toContain(round(bar2 + 1.5 - T0))
    // Nothing is doubled by the rewind.
    const times = guideFrom(T0).map(([, t]) => t)
    expect(new Set(times).size).toBe(times.length)
  })

  test('Guide only: the count-in clicks, then only guide sounds', async () => {
    const { engine, sounds, guide, advance } = setup(oldFaithful, { sound: 'guide' })
    await engine.start()
    advance(6.5)
    const bar1 = T0 + LEAD + 2
    expect(sounds.scheduled.map((s) => s.kind)).toEqual(['accent', 'tick', 'tick', 'tick'])
    expect(sounds.scheduled.every((s) => s.at < bar1)).toBe(true)
    expect(guide.scheduled.length).toBeGreaterThan(6)
  })

  test('Click only: clicks on every beat and no guide', async () => {
    const { engine, sounds, guide, advance } = setup(oldFaithful, { sound: 'click' })
    await engine.start()
    advance(4.4)
    expect(sounds.scheduled.filter((s) => s.at >= T0 + LEAD + 2)).toHaveLength(5)
    expect(guide.scheduled).toEqual([])
  })

  test('Both to Click while playing: the guide stops from now, clicks continue', async () => {
    const { engine, sounds, guide, clock, visibility, advance } = setup(oldFaithful)
    await engine.start()
    visibility.set(true)
    advance(2.2)
    engine.setSound('click')
    expect(guide.scheduled.every((s) => s.at < clock.now())).toBe(true)
    expect(sounds.scheduled.filter((s) => s.at > clock.now()).length).toBeGreaterThan(2)
    advance(2)
    expect(guide.scheduled.every((s) => s.at < clock.now() - 2)).toBe(true)
  })

  test('Both to Guide while playing: queued clicks after the next beat are dropped, the guide stays whole', async () => {
    const { engine, sounds, guide, clock, visibility, advance } = setup(oldFaithful)
    await engine.start()
    visibility.set(true)
    advance(2.2) // bar 1, beat 1; bar 1 and part of bar 2 are queued
    const now = clock.now()
    engine.setSound('guide')
    expect(sounds.scheduled.filter((s) => s.at > now)).toEqual([])
    advance(3)
    expect(sounds.scheduled.filter((s) => s.at > now)).toEqual([])
    const bar = (n: number) => T0 + LEAD + 2 * n
    const guideIn = (a: number) =>
      guide.scheduled.filter((s) => s.at >= a - 1e-9 && s.at < a + 2 - 1e-9).map((s) => [s.kind, round(s.at - a)])
    expect(guideIn(bar(2))).toEqual(OLD_FAITHFUL_GUIDE)
    const times = guide.scheduled.map((s) => s.at)
    expect(new Set(times).size).toBe(times.length)
  })

  test('Guide to Both brings the clicks back from the next beat, and the guide plays on without doubles', async () => {
    const { engine, sounds, guide, clock, visibility, advance } = setup(oldFaithful, { sound: 'guide' })
    await engine.start()
    visibility.set(true)
    advance(2.2)
    engine.setSound('both')
    const after = sounds.scheduled.filter((s) => s.at > clock.now()).map((s) => round(s.at - T0))
    expect(after[0]).toBe(round(LEAD + 2.5))
    const times = guide.scheduled.map((s) => s.at)
    expect(new Set(times).size).toBe(times.length)
    expect(guide.scheduled.some((s) => s.at > clock.now())).toBe(true)
  })

  test('the sound cycles Both, Guide, Click, Both', () => {
    const { engine } = setup(oldFaithful)
    const seen = [engine.getState().sound]
    for (let i = 0; i < 3; i++) {
      engine.cycleSound()
      seen.push(engine.getState().sound)
    }
    expect(seen).toEqual(['both', 'guide', 'click', 'both'])
  })

  test('a tempo change rewinds the guide without doubles or orphans', async () => {
    const { engine, guide, visibility, advance } = setup(oldFaithful)
    await engine.start()
    visibility.set(true)
    advance(2.3)
    engine.metronome.setTempo(100)
    advance(3)
    const times = guide.scheduled.map((s) => s.at)
    expect(new Set(times).size).toBe(times.length)
    // Every guide sound is an expected stroke still on the timeline or already past.
    const expected = new Set(engine.expectedStrokes().map((s) => s.time))
    const recent = guide.scheduled.filter((s) => s.at >= engine.expectedStrokes()[0].time)
    expect(recent.every((s) => expected.has(s.at))).toBe(true)
  })

  test('the count-in is bar 0 of the speed trainer ramp', async () => {
    const { engine, advance } = setup(oldFaithful, { trainer: true })
    await engine.start()
    advance(17.5)
    // Bars 0–3 at 60 BPM (4 s each), then bar 4 at 65 BPM.
    const bar4 = T0 + LEAD + 16
    const strokes = engine.expectedStrokes().filter((s) => s.bar === 4)
    expect(round(strokes[0].time - bar4)).toBe(0)
    expect(round(strokes[1].time - bar4)).toBe(round(60 / 65))
  })

  test('selecting a pattern while stopped sets the beats per bar', () => {
    const { engine } = setup(oldFaithful)
    engine.setPattern(straight('x.x.x.', 3))
    expect(engine.metronome.getState().settings.beatsPerBar).toBe(3)
  })
})
