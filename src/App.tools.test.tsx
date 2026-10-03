// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App'
import { FakeClock } from './engine/clock'
import { MetronomeEngine } from './engine/metronome/metronome'
import { SessionEngine } from './engine/session'
import { RecordingSounds } from './engine/sounds'
import { IntervalTicker } from './engine/ticker'
import { PROJECT_URL } from './project'
import { fakeInput } from './test/fakeInput'
import { MemoryHistory } from './test/memoryHistory'
import { testStrumming } from './test/memoryPatterns'

async function renderApp(operatorConfig?: Promise<{ logRetention?: string }>) {
  const clock = new FakeClock()
  const history = new MemoryHistory()
  const engine = new SessionEngine({ clock, sounds: new RecordingSounds(), history })
  const metronome = new MetronomeEngine({ clock, sounds: new RecordingSounds(), ticker: new IntervalTicker() })
  const { input } = fakeInput()
  const strumming = testStrumming(clock)
  render(
    <App
      engine={engine}
      history={history}
      input={input}
      metronome={metronome}
      strumming={strumming}
      operatorConfig={operatorConfig}
    />,
  )
  await act(async () => {})
  return { engine, metronome, strumming: strumming.engine }
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

const footer = () => screen.queryByRole('contentinfo')

test('the footer with the Privacy link and version shows on setup and the metronome, not during a session', async () => {
  await renderApp()
  expect(footer()?.textContent).toContain('Privacy')
  expect(footer()?.textContent).toContain('dev')
  await choose('Metronome')
  expect(footer()).toBeTruthy()
  await choose('1 minute changes')
  await press(' ', 'Space')
  expect(footer()).toBeNull()
})

test('opening Privacy from the metronome stops it and hides the tools', async () => {
  const { metronome } = await renderApp()
  await choose('Metronome')
  await press(' ', 'Space')
  await choose('Privacy')
  expect(metronome.getState().playing).toBe(false)
  expect(screen.getByRole('heading', { name: 'Privacy' })).toBeTruthy()
  expect(screen.queryByRole('navigation', { name: 'Tools' })).toBeNull()
  await press('Escape')
  expect(screen.getByRole('heading', { name: 'Metronome' })).toBeTruthy()
})

test('Escape from Privacy returns to 1 minute changes with the typed pair', async () => {
  await renderApp()
  fireEvent.change(screen.getByLabelText('Second chord'), { target: { value: 'G' } })
  fireEvent.change(screen.getByLabelText('First chord'), { target: { value: 'E' } })
  await choose('Privacy')
  expect(screen.queryByLabelText('First chord')).toBeNull()
  await press('Escape')
  expect((screen.getByLabelText('First chord') as HTMLInputElement).value).toBe('E')
  expect((screen.getByLabelText('Second chord') as HTMLInputElement).value).toBe('G')
})

test('Space on the privacy page starts nothing', async () => {
  const { engine, metronome } = await renderApp()
  await choose('Privacy')
  await press(' ', 'Space')
  expect(engine.getState().kind).toBe('idle')
  expect(metronome.getState().playing).toBe(false)
  expect(screen.getByRole('heading', { name: 'Privacy' })).toBeTruthy()
})

test('the privacy page shows the loaded operator config', async () => {
  await renderApp(Promise.resolve({ logRetention: 'up to 7 days' }))
  await choose('Privacy')
  expect(screen.getByTestId('access-logs').textContent).toContain('kept for up to 7 days')
})

const homeLink = () => screen.queryByRole('link', { name: 'Fretwork, home' })

test('the logo home link shows on setup, the metronome and the privacy page, not during a session', async () => {
  await renderApp()
  expect(homeLink()?.getAttribute('href')).toBe('/')
  expect(homeLink()?.textContent).toBe('fretwork')
  await choose('Metronome')
  expect(homeLink()).toBeTruthy()
  await choose('Privacy')
  expect(homeLink()).toBeTruthy()
  expect(screen.queryByRole('navigation', { name: 'Tools' })).toBeNull()
  await press('Escape')
  await choose('1 minute changes')
  await press(' ', 'Space')
  expect(homeLink()).toBeNull()
})

async function goHome() {
  await act(async () => {
    fireEvent.click(homeLink()!)
  })
}

test('home from a playing metronome stops it and shows setup', async () => {
  const { metronome } = await renderApp()
  await choose('Metronome')
  await press(' ', 'Space')
  expect(metronome.getState().playing).toBe(true)
  await goHome()
  expect(metronome.getState().playing).toBe(false)
  expect(screen.getByRole('heading', { name: '1 Minute Changes' })).toBeTruthy()
})

test('home from history shows setup with the same pair', async () => {
  await renderApp()
  fireEvent.change(screen.getByLabelText('Second chord'), { target: { value: 'G' } })
  await choose('History')
  expect(screen.getByRole('heading', { name: 'History' })).toBeTruthy()
  await goHome()
  expect(screen.getByRole('heading', { name: '1 Minute Changes' })).toBeTruthy()
  expect((screen.getByLabelText('Second chord') as HTMLInputElement).value).toBe('G')
})

test('home from the privacy page shows setup', async () => {
  await renderApp()
  await choose('Metronome')
  await choose('Privacy')
  await goHome()
  expect(screen.getByRole('heading', { name: '1 Minute Changes' })).toBeTruthy()
  expect(screen.getByRole('navigation', { name: 'Tools' })).toBeTruthy()
})

const repoLink = () => screen.queryByRole('link', { name: 'GitHub' })

test('the footer links to the project on setup and the metronome, not during a session', async () => {
  await renderApp()
  expect(repoLink()?.getAttribute('href')).toBe(PROJECT_URL)
  expect(repoLink()?.getAttribute('target')).toBe('_blank')
  expect(repoLink()?.getAttribute('rel')).toContain('noopener')
  expect(repoLink()?.closest('footer')).toBeTruthy()
  await choose('Metronome')
  expect(repoLink()).toBeTruthy()
  await choose('1 minute changes')
  await press(' ', 'Space')
  expect(repoLink()).toBeNull()
})

test("the footer link matches the privacy page's GitHub link", async () => {
  await renderApp()
  const footerHref = repoLink()?.getAttribute('href')
  await choose('Privacy')
  const privacyLink = within(screen.getByRole('main')).getByRole('link', { name: 'GitHub' })
  expect(privacyLink.getAttribute('href')).toBe(footerHref)
})

describe('strumming tool', () => {
  test('sits between 1 minute changes and the metronome in the switcher', async () => {
    await renderApp()
    const tools = within(screen.getByRole('navigation', { name: 'Tools' }))
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(tools).toEqual(['1 minute changes', 'Strumming', 'Metronome'])
  })

  test('opens from the metronome with the selected pattern', async () => {
    await renderApp()
    await choose('Metronome')
    await choose('Strumming')
    expect(screen.getByRole('heading', { name: 'Strumming' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Old faithful/ }).getAttribute('aria-pressed')).toBe('true')
  })

  test('Space starts the pattern, and neither the metronome nor a session', async () => {
    const { engine, metronome, strumming } = await renderApp()
    await choose('Strumming')
    await press(' ', 'Space')
    expect(strumming.getState().playing).toBe(true)
    expect(metronome.getState().playing).toBe(false)
    expect(engine.getState().kind).toBe('idle')
  })

  test('switching away stops it', async () => {
    const { strumming } = await renderApp()
    await choose('Strumming')
    await press(' ', 'Space')
    await choose('Metronome')
    expect(strumming.getState().playing).toBe(false)
  })

  test('the home link stops it and shows 1 minute changes', async () => {
    const { strumming } = await renderApp()
    await choose('Strumming')
    await press(' ', 'Space')
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Fretwork, home' }))
    })
    expect(strumming.getState().playing).toBe(false)
    expect(screen.getByRole('heading', { name: '1 Minute Changes' })).toBeTruthy()
  })

  test('no tool switcher, home link or footer while editing a pattern', async () => {
    await renderApp()
    await choose('Strumming')
    await choose('New')
    expect(screen.queryByRole('navigation', { name: 'Tools' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Fretwork, home' })).toBeNull()
    expect(footer()).toBeNull()
    await press('Escape')
    expect(screen.getByRole('navigation', { name: 'Tools' })).toBeTruthy()
    expect(footer()).toBeTruthy()
  })
})
