// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { DEFAULT_METRONOME_SETTINGS, type MetronomeSettings } from '../domain/metronomeSettings'
import { FakeClock } from '../engine/clock'
import { MetronomeEngine } from '../engine/metronome/metronome'
import { RecordingSounds } from '../engine/sounds'
import { IntervalTicker } from '../engine/ticker'
import { MetronomeTool } from './MetronomeTool'

function setup(settings: Partial<MetronomeSettings> = {}) {
  const engine = new MetronomeEngine({
    clock: new FakeClock(),
    sounds: new RecordingSounds(),
    ticker: new IntervalTicker(),
    settings: { ...DEFAULT_METRONOME_SETTINGS, ...settings },
  })
  const view = render(<MetronomeTool engine={engine} />)
  return { engine, view }
}

async function press(key: string, init: Partial<KeyboardEventInit> = {}, target: Window | Element = window) {
  await act(async () => {
    fireEvent.keyDown(target, { key, ...init })
  })
}

/** Press T at a given event time; `timeStamp` is read-only, so set it on the event. */
async function tap(timeStampMs: number) {
  const event = new KeyboardEvent('keydown', { key: 't', bubbles: true })
  Object.defineProperty(event, 'timeStamp', { value: timeStampMs })
  await act(async () => {
    window.dispatchEvent(event)
  })
}

const tempo = () => screen.getByTestId('tempo').textContent
const beats = () => screen.getByRole('list').querySelectorAll('li').length

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

test('arrow keys change tempo by 1, or 5 with Shift', async () => {
  setup({ bpm: 100 })
  expect(tempo()).toBe('100')
  await press('ArrowUp')
  expect(tempo()).toBe('101')
  await press('ArrowUp', { shiftKey: true })
  expect(tempo()).toBe('106')
  await press('ArrowDown', { shiftKey: true })
  await press('ArrowDown')
  expect(tempo()).toBe('100')
})

test('left and right arrows change the beats per bar', async () => {
  setup({ beatsPerBar: 4 })
  expect(beats()).toBe(4)
  await press('ArrowLeft')
  expect(beats()).toBe(3)
  await press('ArrowRight')
  await press('ArrowRight')
  expect(beats()).toBe(5)
})

test('Space starts and stops, Escape stops', async () => {
  const { engine } = setup()
  await press(' ')
  expect(engine.getState().playing).toBe(true)
  expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy()
  await press(' ')
  expect(engine.getState().playing).toBe(false)
  await press(' ')
  await press('Escape')
  expect(engine.getState().playing).toBe(false)
})

test('T taps the tempo', async () => {
  setup({ bpm: 100 })
  for (const ms of [1000, 1500, 2000, 2500]) await tap(ms)
  expect(tempo()).toBe('120')
})

test('S turns the speed trainer on while stopped and is ignored while playing', async () => {
  const { engine } = setup()
  await press('s')
  expect(engine.getState().settings.trainerOn).toBe(true)
  expect(screen.getByLabelText('Start BPM')).toBeTruthy()
  await press(' ')
  await press('s')
  expect(engine.getState().settings.trainerOn).toBe(true)
})

test('trainer fields are disabled while playing and progress is shown', async () => {
  setup({ trainerOn: true })
  const fieldset = screen.getByRole('group', { name: '' }) as HTMLFieldSetElement
  expect(fieldset.disabled).toBe(false)
  expect(screen.queryByTestId('trainer-progress')).toBeNull()
  await press(' ')
  expect(fieldset.disabled).toBe(true)
  expect(screen.getByTestId('trainer-progress').textContent).toBe('80 → 120 BPM · Next step in 4 bars')
})

test('an invalid target is reported and blocks starting', async () => {
  const { engine } = setup({ trainerOn: true })
  fireEvent.change(screen.getByLabelText('Target BPM'), { target: { value: '60' } })
  expect(screen.getByRole('alert').textContent).toBe('Target must be above the start tempo.')
  expect(screen.getByRole('button', { name: 'Start' })).toHaveProperty('disabled', true)
  await press(' ')
  expect(engine.getState().playing).toBe(false)
})

test('an emptied field keeps its text and reports the error', async () => {
  setup({ trainerOn: true })
  const step = screen.getByLabelText('Step BPM') as HTMLInputElement
  fireEvent.change(step, { target: { value: '' } })
  expect(step.value).toBe('')
  expect(screen.getByRole('alert').textContent).toMatch(/Step must be/)
  fireEvent.change(step, { target: { value: '10' } })
  expect(screen.queryByRole('alert')).toBeNull()
})

test('keys typed in a trainer field stay in the field; Enter leaves it', async () => {
  const { engine } = setup({ trainerOn: true, bpm: 100 })
  const target = screen.getByLabelText('Target BPM') as HTMLInputElement
  target.focus()
  await press(' ', {}, target)
  await press('ArrowUp', {}, target)
  expect(engine.getState().playing).toBe(false)
  expect(engine.getState().settings.trainer.start).toBe(80)
  await press('Enter', {}, target)
  expect(document.activeElement).not.toBe(target)
})

test('with the trainer on, arrows shift the ramp shown in the fields', async () => {
  setup({ trainerOn: true })
  await press('ArrowUp', { shiftKey: true })
  expect(tempo()).toBe('85')
  expect((screen.getByLabelText('Start BPM') as HTMLInputElement).value).toBe('85')
  expect((screen.getByLabelText('Target BPM') as HTMLInputElement).value).toBe('125')
})

test('closing the tool stops the metronome', async () => {
  const { engine, view } = setup()
  await press(' ')
  expect(engine.getState().playing).toBe(true)
  view.unmount()
  expect(engine.getState().playing).toBe(false)
})
