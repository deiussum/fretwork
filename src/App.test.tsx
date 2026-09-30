// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'
import { FakeClock } from './engine/clock'
import { SessionEngine } from './engine/session'
import { RecordingSounds } from './engine/sounds'
import { fakeInput, type FakeInputOptions } from './test/fakeInput'
import { MemoryHistory } from './test/memoryHistory'

function setup(inputOptions: FakeInputOptions = {}) {
  const clock = new FakeClock()
  const history = new MemoryHistory()
  const engine = new SessionEngine({ clock, sounds: new RecordingSounds(), history })
  const fake = fakeInput(inputOptions)
  const advance = async (seconds: number) => {
    clock.advance(seconds)
    await act(async () => {
      vi.advanceTimersByTime(seconds * 1000)
    })
  }
  return { clock, history, engine, advance, ...fake }
}

async function renderApp(ctx: ReturnType<typeof setup>) {
  render(<App engine={ctx.engine} history={ctx.history} input={ctx.input} />)
  await act(async () => {}) // let the last pair / results load
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

test('Space on the setup screen starts a session with the selected pair', async () => {
  const ctx = setup()
  const start = vi.spyOn(ctx.engine, 'start')
  await renderApp(ctx)
  await press(' ', 'Space')
  expect(start).toHaveBeenCalledWith(['A', 'D'])
  expect(ctx.engine.getState().kind).toBe('countIn')
})

test('selecting the same chord twice warns and blocks starting', async () => {
  const ctx = setup()
  const start = vi.spyOn(ctx.engine, 'start')
  await renderApp(ctx)
  fireEvent.change(screen.getByLabelText('Second chord'), { target: { value: 'A' } })
  expect(screen.getByRole('alert').textContent).toMatch(/two different chords/)
  expect(screen.getByRole('button', { name: /start/i })).toHaveProperty('disabled', true)
  await press(' ', 'Space')
  expect(start).not.toHaveBeenCalled()
})

test('the last practised pair is preselected', async () => {
  const ctx = setup()
  ctx.history.lastPair = ['C', 'G']
  await renderApp(ctx)
  expect(screen.getByLabelText<HTMLInputElement>('First chord').value).toBe('C')
  expect(screen.getByLabelText<HTMLInputElement>('Second chord').value).toBe('G')
})

test('a custom chord can be typed into either slot', async () => {
  const ctx = setup()
  await renderApp(ctx)
  fireEvent.change(screen.getByLabelText('First chord'), { target: { value: 'D/F#' } })
  fireEvent.change(screen.getByLabelText('Second chord'), { target: { value: ' G ' } })
  const button = screen.getByRole('button', { name: /start/i })
  expect(button.textContent).toBe('Start D/F# ↔ G')
  expect(button).toHaveProperty('disabled', false)
})

test('invalid chord names warn and block starting', async () => {
  const ctx = setup()
  await renderApp(ctx)
  const first = screen.getByLabelText('First chord')
  const cases: [string, RegExp][] = [
    ['', /Enter a chord/],
    ['A|B', /can't contain \|/],
    ['F#m7b5/E12345', /at most 12 characters/],
  ]
  for (const [value, message] of cases) {
    fireEvent.change(first, { target: { value } })
    expect(screen.getByRole('alert').textContent).toMatch(message)
    expect(screen.getByRole('button', { name: /start/i })).toHaveProperty('disabled', true)
  }
})

test('chords from saved results are suggested once', async () => {
  const ctx = setup()
  ctx.history.results = [
    { id: '1', pairKey: 'D/F#|G', chords: ['D/F#', 'G'], score: 20, durationSec: 60, at: '2026-09-01T10:00:00Z', method: 'manual' },
  ]
  await renderApp(ctx)
  const options = [...document.querySelectorAll('datalist option')].map((o) => o.getAttribute('value'))
  expect(options.filter((v) => v === 'D/F#')).toHaveLength(1)
  expect(options.filter((v) => v === 'G')).toHaveLength(1)
})

test('Space typed into a chord field does not start a session', async () => {
  const ctx = setup()
  const start = vi.spyOn(ctx.engine, 'start')
  await renderApp(ctx)
  const first = screen.getByLabelText('First chord')
  first.focus()
  await act(async () => {
    fireEvent.keyDown(first, { key: ' ', code: 'Space' })
  })
  expect(start).not.toHaveBeenCalled()
})

test('Enter leaves the chord field so Space starts the session', async () => {
  const ctx = setup()
  await renderApp(ctx)
  const first = screen.getByLabelText('First chord')
  first.focus()
  fireEvent.change(first, { target: { value: 'Amadd9' } })
  await act(async () => {
    fireEvent.keyDown(first, { key: 'Enter', code: 'Enter' })
  })
  expect(document.activeElement).not.toBe(first)
  await press(' ', 'Space')
  expect(ctx.engine.getState().kind).toBe('countIn')
})

test('Escape in the score entry discards the attempt', async () => {
  const ctx = setup()
  await renderApp(ctx)
  await press(' ', 'Space')
  await ctx.advance(0.15 + 4 + 60)
  const input = screen.getByLabelText('How many strums?')
  await act(async () => {
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })
  })
  expect(ctx.engine.getState().kind).toBe('idle')
  expect(ctx.history.results).toHaveLength(0)
})

test('invalid score shows a message; a valid score shows the result', async () => {
  const ctx = setup()
  await renderApp(ctx)
  await press(' ', 'Space')
  await ctx.advance(0.15 + 4 + 60)

  const input = screen.getByLabelText('How many strums?')
  expect(document.activeElement).toBe(input)
  fireEvent.change(input, { target: { value: 'abc' } })
  await act(async () => {
    fireEvent.submit(input.closest('form')!)
  })
  expect(screen.getByRole('alert').textContent).toMatch(/whole number from 0 to 999/)
  expect(ctx.history.results).toHaveLength(0)

  fireEvent.change(input, { target: { value: '34' } })
  await act(async () => {
    fireEvent.submit(input.closest('form')!)
  })
  expect(ctx.history.results.map((r) => r.score)).toEqual([34])
  expect(screen.getByText('First score for this pair!')).toBeTruthy()
})

test('Escape during the run returns to setup with the pair kept', async () => {
  const ctx = setup()
  ctx.history.lastPair = ['C', 'G']
  await renderApp(ctx)
  await press(' ', 'Space')
  await ctx.advance(10)
  await press('Escape')
  expect(ctx.engine.getState().kind).toBe('idle')
  expect(screen.getByLabelText<HTMLInputElement>('First chord').value).toBe('C')
})

test('shows a notice when storage is unavailable', async () => {
  const ctx = setup()
  ctx.history.available = false
  await renderApp(ctx)
  expect(screen.getByText(/won't be saved/)).toBeTruthy()
})
