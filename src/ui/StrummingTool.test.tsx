// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defaultTripletDirections, parseSlots, type Pattern } from '../domain/strumming'
import { PRESET_PATTERNS } from '../domain/strummingPresets'
import { FakeClock } from '../engine/clock'
import { testStrumming } from '../test/memoryPatterns'
import { PatternGrid } from './PatternGrid'
import { StrummingTool } from './StrummingTool'

const mine: Pattern = {
  id: 'c1',
  name: 'Mine',
  beatsPerBar: 4,
  subdivision: 2,
  swing: 0,
  slots: parseSlots('x.x.x.x.'),
}

function setup(custom: Pattern[] = [], storageAvailable = true) {
  const strumming = testStrumming(new FakeClock(), custom)
  strumming.patterns.available = storageAvailable
  const onEditingChange = vi.fn()
  render(<StrummingTool engine={strumming.engine} patterns={strumming.patterns} onEditingChange={onEditingChange} />)
  return { ...strumming, onEditingChange }
}

async function press(key: string, init: Partial<KeyboardEventInit> = {}, target: Window | Element = window) {
  await act(async () => {
    fireEvent.keyDown(target, { key, ...init })
  })
}

async function click(element: Element) {
  await act(async () => {
    fireEvent.click(element)
  })
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const selectedPattern = () =>
  screen.getAllByRole('button', { pressed: true }).find((b) => b.classList.contains('pattern-item'))?.textContent

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('grid', () => {
  const labels = () =>
    within(screen.getByRole('list', { name: 'Pattern' }))
      .getAllByRole('listitem')
      .filter((li) => li.classList.contains('slot'))
      .map((li) => li.getAttribute('aria-label'))

  test('8ths count 1 & with down and up', () => {
    render(<PatternGrid pattern={PRESET_PATTERNS[2]} bars={[0]} />)
    expect(labels().slice(0, 4)).toEqual(['1: down strum', '&: up miss', '2: down strum', '&: up strum'])
  })

  test('16ths count 1 e & a', () => {
    const p: Pattern = { ...mine, beatsPerBar: 2, subdivision: 4, slots: parseSlots('x'.repeat(8)) }
    render(<PatternGrid pattern={p} bars={[0]} />)
    expect(labels().map((l) => l!.split(':')[0])).toEqual(['1', 'e', '&', 'a', '2', 'e', '&', 'a'])
  })

  test('triplets count 1 trip let and use their directions', () => {
    const p: Pattern = {
      id: 't',
      name: 'T',
      beatsPerBar: 1,
      subdivision: 3,
      slots: parseSlots('x>c'),
      directions: defaultTripletDirections(3),
    }
    render(<PatternGrid pattern={p} bars={[0]} />)
    expect(labels()).toEqual(['1: down strum', 'trip: up accent', 'let: down chuck'])
  })

  test('each stroke looks different', () => {
    render(<PatternGrid pattern={{ ...mine, slots: parseSlots('x>c.x>c.') }} bars={[0]} />)
    const strokes = [...document.querySelectorAll('.slot')].slice(0, 4).map((el) => el.getAttribute('data-stroke'))
    expect(strokes).toEqual(['hit', 'accent', 'chuck', 'miss'])
    expect(document.querySelectorAll('.slot.accent .slot-badge')[0].textContent).toBe('>')
    expect(document.querySelectorAll('.slot.chuck .slot-badge')[0].textContent).toBe('✕')
  })

  test('a two-bar pattern playing its second bar shows bar 2 of 2 and the current slot', () => {
    const p = { ...mine, slots: parseSlots('x.x.x.x.|xxxxxxxx') }
    render(<PatternGrid pattern={p} bars={[1]} current={[1, 5]} />)
    expect(screen.getByText('Bar 2 of 2')).toBeTruthy()
    const current = document.querySelector('[aria-current="step"]')
    expect(current?.getAttribute('aria-label')).toBe('&: up strum')
    expect([...document.querySelectorAll('.slot')].indexOf(current!)).toBe(5)
  })
})

describe('swing', () => {
  const shares = () =>
    [...document.querySelectorAll('.slot')].slice(0, 2).map((el) => Number((el as HTMLElement).style.getPropertyValue('--share')))

  test('a swung pattern spaces its slots by time; a straight one in halves', () => {
    const shuffle = PRESET_PATTERNS.find((p) => p.name === 'Shuffle')!
    const view = render(<PatternGrid pattern={shuffle} bars={[0]} />)
    const [on, off] = shares()
    expect(on).toBeCloseTo(2 / 3, 9)
    expect(off).toBeCloseTo(1 / 3, 9)
    view.unmount()
    render(<PatternGrid pattern={PRESET_PATTERNS[2]} bars={[0]} />)
    expect(shares()).toEqual([0.5, 0.5])
  })

  test('Shuffle shows its swing on the player and in the list; Old faithful shows none', async () => {
    const { engine } = setup()
    expect(document.querySelector('.pattern-title .swing-tag')).toBeNull()
    expect(button(/^Shuffle/).textContent).toContain('Swing 100%')
    expect(button(/^Old faithful/).textContent).not.toContain('Swing')
    await click(button(/^Shuffle/))
    expect(engine.getState().pattern.name).toBe('Shuffle')
    expect(document.querySelector('.pattern-title .swing-tag')?.textContent).toBe('Swing 100%')
  })
})

describe('pattern list', () => {
  test('lists the presets with Old faithful selected; presets can only be duplicated', () => {
    setup()
    expect(within(screen.getByRole('list', { name: 'Presets' })).getAllByRole('button')).toHaveLength(
      PRESET_PATTERNS.length,
    )
    expect(selectedPattern()).toContain('Old faithful')
    expect(button('Duplicate')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  test('duplicating opens a copy in the editor; saving adds and selects it', async () => {
    const { engine, patterns, onEditingChange } = setup()
    await click(button('Duplicate'))
    expect(screen.getByRole('heading', { name: 'New pattern' })).toBeTruthy()
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Old faithful (copy)')
    expect(onEditingChange).toHaveBeenLastCalledWith(true)
    await click(button('Save'))
    expect(patterns.saved.map((p) => p.name)).toEqual(['Old faithful (copy)'])
    expect(patterns.saved[0].slots).toEqual(PRESET_PATTERNS[2].slots)
    expect(engine.getState().pattern.name).toBe('Old faithful (copy)')
    expect(selectedPattern()).toContain('Old faithful (copy)')
    expect(onEditingChange).toHaveBeenLastCalledWith(false)
  })

  test('deleting the selected pattern asks first, then selects Old faithful', async () => {
    const { engine, patterns } = setup([mine])
    await click(button(/Mine/))
    expect(engine.getState().pattern.id).toBe('c1')
    await click(button('Delete'))
    expect(patterns.saved).toEqual([mine])
    await click(within(screen.getByRole('group', { name: 'Confirm delete' })).getByRole('button', { name: 'Delete' }))
    expect(patterns.saved).toEqual([])
    expect(engine.getState().pattern.name).toBe('Old faithful')
  })

  test('editing a custom pattern replaces it', async () => {
    const { patterns } = setup([mine])
    await click(button(/Mine/))
    await click(button('Edit'))
    expect(screen.getByRole('heading', { name: 'Edit pattern' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Mine too' } })
    await click(button('Save'))
    expect(patterns.saved.map((p) => [p.id, p.name])).toEqual([['c1', 'Mine too']])
  })

  test('says patterns will not be saved when storage is unavailable', () => {
    setup([], false)
    expect(screen.getByText(/your patterns will be lost/)).toBeTruthy()
  })
})

describe('editor', () => {
  const slot = (name: RegExp) => screen.getAllByRole('button', { name })[0]

  test('choosing a slot cycles strum, accent, chuck, miss', async () => {
    setup()
    await click(button('New'))
    const first = () => slot(/^1: /)
    expect(first().getAttribute('aria-label')).toBe('1: down strum')
    await click(first())
    expect(first().getAttribute('aria-label')).toBe('1: down accent')
    await click(first())
    expect(first().getAttribute('aria-label')).toBe('1: down chuck')
    await click(first())
    expect(first().getAttribute('aria-label')).toBe('1: down miss')
    await click(first())
    expect(first().getAttribute('aria-label')).toBe('1: down strum')
  })

  test('a pattern of only misses is refused', async () => {
    const { patterns } = setup()
    await click(button('New'))
    for (const name of [/^1: /, /^2: /, /^3: /, /^4: /]) {
      for (let i = 0; i < 3; i++) await click(slot(name))
    }
    await click(button('Save'))
    expect(screen.getByRole('alert').textContent).toBe('A pattern needs at least one strum.')
    expect(patterns.saved).toEqual([])
  })

  test('an empty name is refused', async () => {
    setup()
    await click(button('New'))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' ' } })
    await click(button('Save'))
    expect(screen.getByRole('alert').textContent).toBe('Give the pattern a name.')
  })

  test('swing is hidden for triplets, which flip direction with F or the direction control', async () => {
    setup()
    await click(button('New'))
    expect(screen.getByLabelText(/Swing/)).toBeTruthy()
    await click(screen.getByLabelText('Triplets'))
    expect(screen.queryByLabelText(/Swing/)).toBeNull()
    expect(slot(/^trip: /).getAttribute('aria-label')).toBe('trip: up miss')
    await press('f', {}, slot(/^trip: /))
    expect(slot(/^trip: /).getAttribute('aria-label')).toBe('trip: down miss')
    await click(screen.getAllByRole('button', { name: /Flip direction of trip/ })[0])
    expect(slot(/^trip: /).getAttribute('aria-label')).toBe('trip: up miss')
  })

  test('changing the subdivision keeps the strokes; arrows move between slots', async () => {
    setup()
    await click(button('New'))
    await click(screen.getByLabelText('16ths'))
    const labels = screen
      .getAllByRole('button')
      .filter((b) => b.classList.contains('slot-button'))
      .map((b) => b.getAttribute('aria-label'))
    expect(labels).toHaveLength(16)
    expect(labels.slice(0, 3)).toEqual(['1: down strum', 'e: up miss', '&: down strum'])
    const first = slot(/^1: /)
    first.focus()
    await press('ArrowRight', {}, first)
    expect(document.activeElement?.getAttribute('aria-label')).toBe('e: up miss')
    expect((document.activeElement as HTMLElement).tabIndex).toBe(0)
  })

  test('Escape leaves without saving', async () => {
    const { patterns } = setup()
    await click(button('New'))
    await click(slot(/^1: /))
    await press('Escape')
    expect(screen.getByRole('heading', { name: 'Strumming' })).toBeTruthy()
    expect(patterns.saved).toEqual([])
  })

  test('opening the editor while playing stops playback', async () => {
    const { engine } = setup()
    await press(' ')
    expect(engine.getState().playing).toBe(true)
    await click(button('New'))
    expect(engine.getState().playing).toBe(false)
  })

  test('Space in the editor does not start playback', async () => {
    const { engine } = setup()
    await click(button('New'))
    await press(' ')
    expect(engine.getState().playing).toBe(false)
  })
})

describe('keyboard', () => {
  test('Space starts and stops, Escape stops', async () => {
    const { engine } = setup()
    await press(' ')
    expect(engine.getState().playing).toBe(true)
    await press(' ')
    expect(engine.getState().playing).toBe(false)
    await press(' ')
    await press('Escape')
    expect(engine.getState().playing).toBe(false)
  })

  test('arrow up and down change the tempo, by 5 with Shift', async () => {
    const { engine } = setup()
    await press('ArrowUp')
    await press('ArrowUp', { shiftKey: true })
    expect(engine.metronome.getState().settings.bpm).toBe(86)
    expect(screen.getByTestId('tempo').textContent).toBe('86')
  })

  test('arrow right and left select the next and previous pattern', async () => {
    const { engine } = setup([mine])
    await press('ArrowRight')
    expect(engine.getState().pattern.name).toBe(PRESET_PATTERNS[3].name)
    await press('ArrowLeft')
    await press('ArrowLeft')
    expect(engine.getState().pattern.name).toBe(PRESET_PATTERNS[1].name)
    for (let i = 0; i < 10; i++) await press('ArrowRight')
    expect(engine.getState().pattern.id).toBe('c1')
  })

  test('G cycles the sound: Both, Guide, Click, Both', async () => {
    const { engine } = setup()
    const checked = () => (['Click', 'Guide', 'Both'] as const).find((l) => (screen.getByLabelText(l) as HTMLInputElement).checked)
    expect(checked()).toBe('Both')
    await press('g')
    expect(engine.getState().sound).toBe('guide')
    expect(checked()).toBe('Guide')
    await press('G')
    expect(checked()).toBe('Click')
    await press('g')
    expect(checked()).toBe('Both')
  })

  test('choosing a sound sets it', async () => {
    const { engine } = setup()
    await click(screen.getByLabelText('Click'))
    expect(engine.getState().sound).toBe('click')
  })

  test('S toggles the speed trainer only while stopped', async () => {
    const { engine } = setup()
    await press('s')
    expect(engine.metronome.getState().settings.trainerOn).toBe(true)
    await press(' ')
    await press('s')
    expect(engine.metronome.getState().settings.trainerOn).toBe(true)
  })

  test('T taps the tempo', async () => {
    const { engine } = setup()
    for (const ms of [0, 667, 1334, 2001, 2668]) {
      const event = new KeyboardEvent('keydown', { key: 't', bubbles: true })
      Object.defineProperty(event, 'timeStamp', { value: ms })
      await act(async () => {
        window.dispatchEvent(event)
      })
    }
    expect(engine.metronome.getState().settings.bpm).toBe(90)
  })

  test('a focused number field keeps Space and arrows', async () => {
    const { engine } = setup()
    await press('s')
    const field = screen.getByLabelText('Target BPM')
    field.focus()
    await press(' ', {}, field)
    await press('ArrowUp', {}, field)
    expect(engine.getState().playing).toBe(false)
    expect(engine.metronome.getState().settings.bpm).toBe(80)
  })
})
