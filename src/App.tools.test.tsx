// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'
import { FakeClock } from './engine/clock'
import { MetronomeEngine } from './engine/metronome/metronome'
import { SessionEngine } from './engine/session'
import { RecordingSounds } from './engine/sounds'
import { IntervalTicker } from './engine/ticker'
import { fakeInput } from './test/fakeInput'
import { MemoryHistory } from './test/memoryHistory'

async function renderApp() {
  const clock = new FakeClock()
  const history = new MemoryHistory()
  const engine = new SessionEngine({ clock, sounds: new RecordingSounds(), history })
  const metronome = new MetronomeEngine({ clock, sounds: new RecordingSounds(), ticker: new IntervalTicker() })
  const { input } = fakeInput()
  render(<App engine={engine} history={history} input={input} metronome={metronome} />)
  await act(async () => {})
  return { engine, metronome }
}

async function press(key: string, code = key) {
  await act(async () => {
    fireEvent.keyDown(window, { key, code })
  })
}

async function choose(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }))
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

test('opens on 1 minute changes and switches to the metronome', async () => {
  await renderApp()
  expect(screen.getByRole('button', { name: '1 minute changes' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('heading', { name: '1 Minute Changes' })).toBeTruthy()
  await choose('Metronome')
  expect(screen.getByRole('heading', { name: 'Metronome' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: '1 Minute Changes' })).toBeNull()
})

test('Space on the metronome starts it and no session', async () => {
  const { engine, metronome } = await renderApp()
  await choose('Metronome')
  await press(' ', 'Space')
  expect(metronome.getState().playing).toBe(true)
  expect(engine.getState().kind).toBe('idle')
})

test('Space on 1 minute changes starts a session and not the metronome', async () => {
  const { engine, metronome } = await renderApp()
  await press(' ', 'Space')
  expect(engine.getState().kind).toBe('countIn')
  expect(metronome.getState().playing).toBe(false)
})

test('the tool switcher is hidden while a session is in progress', async () => {
  const { engine } = await renderApp()
  await press(' ', 'Space')
  expect(screen.queryByRole('navigation', { name: 'Tools' })).toBeNull()
  await press('Escape')
  expect(engine.getState().kind).toBe('idle')
  expect(screen.getByRole('navigation', { name: 'Tools' })).toBeTruthy()
})

test('switching away from the metronome stops it', async () => {
  const { metronome } = await renderApp()
  await choose('Metronome')
  await press(' ', 'Space')
  expect(metronome.getState().playing).toBe(true)
  await choose('1 minute changes')
  expect(metronome.getState().playing).toBe(false)
})

test('the chosen pair survives a visit to the metronome', async () => {
  await renderApp()
  fireEvent.change(screen.getByLabelText('Second chord'), { target: { value: 'E' } })
  await choose('Metronome')
  await choose('1 minute changes')
  expect((screen.getByLabelText('Second chord') as HTMLInputElement).value).toBe('E')
})
