// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'
import { FakeClock } from './engine/clock'
import { MetronomeEngine } from './engine/metronome/metronome'
import { SessionEngine } from './engine/session'
import { RecordingSounds } from './engine/sounds'
import { IntervalTicker } from './engine/ticker'
import { domError, fakeInput, type FakeInputOptions } from './test/fakeInput'
import { MemoryHistory } from './test/memoryHistory'

function setup(inputOptions: FakeInputOptions = {}) {
  const clock = new FakeClock()
  const history = new MemoryHistory()
  const engine = new SessionEngine({ clock, sounds: new RecordingSounds(), history })
  const metronome = new MetronomeEngine({ clock, sounds: new RecordingSounds(), ticker: new IntervalTicker() })
  const fake = fakeInput(inputOptions)
  const advance = async (seconds: number) => {
    clock.advance(seconds)
    await act(async () => {
      vi.advanceTimersByTime(seconds * 1000)
    })
  }
  return { clock, history, engine, metronome, advance, ...fake }
}

async function renderApp(ctx: ReturnType<typeof setup>) {
  render(<App engine={ctx.engine} history={ctx.history} input={ctx.input} metronome={ctx.metronome} />)
  await act(async () => {})
}

async function click(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element)
  })
}

async function press(key: string, code = key) {
  await act(async () => {
    fireEvent.keyDown(window, { key, code })
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

test('selecting Mic asks the input controller to open the microphone', async () => {
  const ctx = setup()
  await renderApp(ctx)
  expect(screen.getByRole('radio', { name: 'Manual' }).getAttribute('aria-checked')).toBe('true')
  await click(screen.getByRole('radio', { name: 'Mic' }))
  expect(ctx.mediaDevices.getUserMedia).toHaveBeenCalled()
  expect(screen.getByRole('radio', { name: 'Mic' }).getAttribute('aria-checked')).toBe('true')
  expect(screen.getByLabelText('Input')).toBeTruthy()
})

test('denied permission shows a message and stays on Manual', async () => {
  const ctx = setup({ fail: () => domError('NotAllowedError') })
  await renderApp(ctx)
  await click(screen.getByRole('radio', { name: 'Mic' }))
  expect(screen.getByRole('alert').textContent).toMatch(/Microphone access was blocked/)
  expect(screen.getByRole('radio', { name: 'Manual' }).getAttribute('aria-checked')).toBe('true')
})

test('the channel option is hidden for single-channel inputs', async () => {
  const mono = setup({ channelCount: 1 })
  await renderApp(mono)
  await click(screen.getByRole('radio', { name: 'Mic' }))
  expect(screen.queryByLabelText('Channel')).toBeNull()
  cleanup()

  const stereo = setup({ channelCount: 2 })
  await renderApp(stereo)
  await click(screen.getByRole('radio', { name: 'Mic' }))
  expect(screen.getByLabelText('Channel')).toBeTruthy()
})

test('the strum indicator flashes on each detected strum', async () => {
  const ctx = setup()
  await renderApp(ctx)
  await click(screen.getByRole('radio', { name: 'Mic' }))
  expect(screen.queryByTestId('strum-flash')).toBeNull()
  await act(async () => ctx.emit({ type: 'onset', time: 1.5 }))
  const first = screen.getByTestId('strum-flash')
  await act(async () => ctx.emit({ type: 'onset', time: 2.5 }))
  // A new element restarts the flash animation.
  expect(screen.getByTestId('strum-flash')).not.toBe(first)
})

test('Mic mode shows a live count during the run and prefills the score', async () => {
  const ctx = setup()
  await renderApp(ctx)
  await click(screen.getByRole('radio', { name: 'Mic' }))
  await press(' ', 'Space')
  await ctx.advance(0.15 + 4 + 1) // go is at 4.15
  for (const t of [4.5, 5, 5.5]) await act(async () => ctx.emit({ type: 'onset', time: t }))
  expect(screen.getByTestId('live-count').textContent).toBe('3 strums')

  await ctx.advance(60)
  const input = screen.getByLabelText<HTMLInputElement>('How many strums?')
  expect(input.value).toBe('3')
  expect(document.activeElement).toBe(input)
  expect([input.selectionStart, input.selectionEnd]).toEqual([0, 1])
  expect(screen.getByText(/Detected 3 strums/)).toBeTruthy()
})

test('Manual mode shows no live count and an empty score with the counting rule', async () => {
  const ctx = setup()
  await renderApp(ctx)
  await press(' ', 'Space')
  await ctx.advance(5)
  expect(screen.queryByTestId('live-count')).toBeNull()
  await ctx.advance(60)
  expect(screen.getByLabelText<HTMLInputElement>('How many strums?').value).toBe('')
  expect(screen.getByText(/every strum you played, including the first/)).toBeTruthy()
})

test('input lost during the run shows a message and no prefill', async () => {
  const ctx = setup()
  await renderApp(ctx)
  await click(screen.getByRole('radio', { name: 'Mic' }))
  await press(' ', 'Space')
  await ctx.advance(10)
  await act(async () => ctx.tracks[0].end())
  await ctx.advance(60)
  expect(screen.getByRole('alert').textContent).toMatch(/input was lost/)
  expect(screen.getByLabelText<HTMLInputElement>('How many strums?').value).toBe('')
})

test('starting is blocked while Mic mode has no working input', async () => {
  const ctx = setup()
  const start = vi.spyOn(ctx.engine, 'start')
  await renderApp(ctx)
  await click(screen.getByRole('radio', { name: 'Mic' }))
  await act(async () => ctx.tracks[0].end())
  await press(' ', 'Space')
  expect(start).not.toHaveBeenCalled()
  expect(screen.getByText(/needs a working audio input/)).toBeTruthy()
})
