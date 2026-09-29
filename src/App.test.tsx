// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'
import { FakeClock } from './engine/clock'
import { SessionEngine } from './engine/session'
import { RecordingSounds } from './engine/sounds'
import { MemoryHistory } from './test/memoryHistory'

function setup() {
  const clock = new FakeClock()
  const history = new MemoryHistory()
  const engine = new SessionEngine({ clock, sounds: new RecordingSounds(), history })
  const advance = async (seconds: number) => {
    clock.advance(seconds)
    await act(async () => {
      vi.advanceTimersByTime(seconds * 1000)
    })
  }
  return { clock, history, engine, advance }
}

async function renderApp(ctx: ReturnType<typeof setup>) {
  render(<App engine={ctx.engine} history={ctx.history} />)
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
  expect(screen.getByLabelText<HTMLSelectElement>('First chord').value).toBe('C')
  expect(screen.getByLabelText<HTMLSelectElement>('Second chord').value).toBe('G')
})

test('invalid score shows a message; a valid score shows the result', async () => {
  const ctx = setup()
  await renderApp(ctx)
  await press(' ', 'Space')
  await ctx.advance(0.15 + 4 + 60)

  const input = screen.getByLabelText('How many changes?')
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
  expect(screen.getByLabelText<HTMLSelectElement>('First chord').value).toBe('C')
})

test('shows a notice when storage is unavailable', async () => {
  const ctx = setup()
  ctx.history.available = false
  await renderApp(ctx)
  expect(screen.getByRole('status').textContent).toMatch(/won't be saved/)
})
