// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '../App'
import { FakeClock } from '../engine/clock'
import { MetronomeEngine } from '../engine/metronome/metronome'
import { SessionEngine } from '../engine/session'
import { RecordingSounds } from '../engine/sounds'
import { IntervalTicker } from '../engine/ticker'
import { fakeInput } from '../test/fakeInput'
import { testStrumming } from '../test/memoryPatterns'
import { MemoryHistory } from '../test/memoryHistory'
import { MemoryUiPrefs } from '../test/memoryUiPrefs'
import confirmScreenSource from './ConfirmScreen.tsx?raw'
import { JUSTIN_GUITAR_URL } from './HowItWorks'

async function renderApp(uiPrefs = new MemoryUiPrefs()) {
  const clock = new FakeClock()
  const history = new MemoryHistory()
  const engine = new SessionEngine({ clock, sounds: new RecordingSounds(), history })
  const metronome = new MetronomeEngine({ clock, sounds: new RecordingSounds(), ticker: new IntervalTicker() })
  const { input } = fakeInput()
  render(<App engine={engine} history={history} input={input} metronome={metronome} strumming={testStrumming(clock)} uiPrefs={uiPrefs} />)
  await act(async () => {})
  return { engine, uiPrefs }
}

const details = () => document.querySelector('details.how-it-works') as HTMLDetailsElement
const summary = () => screen.getByText('How it works', { selector: 'summary' })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

test('open on first visit', async () => {
  await renderApp()
  expect(details().open).toBe(true)
})

test('closed when the saved preference says so', async () => {
  await renderApp(new MemoryUiPrefs({ changesHelpOpen: false }))
  expect(details().open).toBe(false)
})

test('closing it saves the preference', async () => {
  const { uiPrefs } = await renderApp()
  await act(async () => {
    fireEvent.click(summary())
  })
  await vi.waitFor(() => expect(uiPrefs.saved.at(-1)).toEqual({ changesHelpOpen: false }))
  expect(details().open).toBe(false)
})

test('credits JustinGuitar with a link that opens in a new tab', async () => {
  await renderApp()
  const link = screen.getByRole('link', { name: 'JustinGuitar' })
  expect(link.getAttribute('href')).toBe(JUSTIN_GUITAR_URL)
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('rel')).toContain('noopener')
})

test('states the same counting rule as the confirm screen', async () => {
  await renderApp()
  expect(confirmScreenSource).toContain('every strum you played, including the first')
  expect(details().textContent).toContain('strums you played, including the first')
})

test('Space on the focused toggle does not start a session; Space elsewhere does', async () => {
  const { engine } = await renderApp()
  summary().focus()
  await act(async () => {
    fireEvent.keyDown(summary(), { key: ' ', code: 'Space' })
  })
  expect(engine.getState().kind).toBe('idle')
  summary().blur()
  await act(async () => {
    fireEvent.keyDown(window, { key: ' ', code: 'Space' })
  })
  expect(engine.getState().kind).toBe('countIn')
})
