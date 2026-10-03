import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import {
  MAX_PATTERN_BARS,
  MAX_PATTERN_BEATS,
  MIN_PATTERN_BARS,
  MIN_PATTERN_BEATS,
  barsOf,
  countLabel,
  directionOf,
  nextStroke,
  reshapePattern,
  slotsPerBar,
  validatePattern,
  type Pattern,
  type Subdivision,
} from '../domain/strumming'
import { STROKE_NAMES } from './format'
import { SlotCell } from './PatternGrid'
import { Stepper } from './TempoControls'

type Props = {
  /** The pattern to edit; a new or duplicated one has an id not yet saved. */
  initial: Pattern
  title: string
  onSave: (pattern: Pattern) => void
  onCancel: () => void
}

const SUBDIVISIONS: { value: Subdivision; label: string }[] = [
  { value: 2, label: '8ths' },
  { value: 4, label: '16ths' },
  { value: 3, label: 'Triplets' },
]

/** Edit a working copy of a pattern; nothing changes until it is saved. */
export function PatternEditor({ initial, title, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(initial)
  const [problems, setProblems] = useState<string[]>([])
  const [focused, setFocused] = useState(0)
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([])
  const nameId = useId()
  const swingId = useId()
  const subdivisionName = useId()

  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  })
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onCancelRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const update = (next: Pattern) => {
    setDraft(next)
    setProblems([])
    setFocused((f) => Math.min(f, next.slots.length - 1))
  }

  const cycle = (index: number) => {
    const slots = [...draft.slots]
    slots[index] = nextStroke(slots[index])
    update({ ...draft, slots })
  }

  const flip = (index: number) => {
    if (draft.subdivision !== 3) return
    const directions = [...draft.directions]
    directions[index] = directions[index] === 'down' ? 'up' : 'down'
    update({ ...draft, directions })
  }

  const moveFocus = (index: number) => {
    const next = Math.max(0, Math.min(draft.slots.length - 1, index))
    setFocused(next)
    slotRefs.current[next]?.focus()
  }

  const onSlotKey = (e: KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      moveFocus(index + (e.key === 'ArrowRight' ? 1 : -1))
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      moveFocus(e.key === 'Home' ? 0 : draft.slots.length - 1)
    } else if (e.key === 'f' || e.key === 'F') {
      flip(index)
    }
  }

  const save = () => {
    const found = validatePattern(draft)
    if (found.length > 0) setProblems(found)
    else onSave({ ...draft, name: draft.name.trim() })
  }

  const perBar = slotsPerBar(draft)
  const bars = barsOf(draft)

  return (
    <section className="screen pattern-editor">
      <h1>{title}</h1>

      <div className="editor-fields">
        <div className="editor-name">
          <label htmlFor={nameId}>Name</label>
          <input
            id={nameId}
            type="text"
            maxLength={60}
            value={draft.name}
            onChange={(e) => update({ ...draft, name: e.target.value })}
          />
        </div>
        <Stepper
          label="Beats per bar"
          value={String(draft.beatsPerBar)}
          onDown={() =>
            draft.beatsPerBar > MIN_PATTERN_BEATS && update(reshapePattern(draft, { beatsPerBar: draft.beatsPerBar - 1 }))
          }
          onUp={() =>
            draft.beatsPerBar < MAX_PATTERN_BEATS && update(reshapePattern(draft, { beatsPerBar: draft.beatsPerBar + 1 }))
          }
        />
        <Stepper
          label="Bars"
          value={String(bars)}
          onDown={() => bars > MIN_PATTERN_BARS && update(reshapePattern(draft, { bars: bars - 1 }))}
          onUp={() => bars < MAX_PATTERN_BARS && update(reshapePattern(draft, { bars: bars + 1 }))}
        />
        <fieldset className="editor-subdivision">
          <legend>Subdivision</legend>
          {SUBDIVISIONS.map(({ value, label }) => (
            <label key={value} className="checkbox">
              <input
                type="radio"
                name={subdivisionName}
                checked={draft.subdivision === value}
                onChange={() => update(reshapePattern(draft, { subdivision: value }))}
              />
              {label}
            </label>
          ))}
        </fieldset>
        {draft.subdivision !== 3 && (
          <div className="editor-swing">
            <label htmlFor={swingId}>Swing {Math.round(draft.swing * 100)}%</label>
            <input
              id={swingId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(draft.swing * 100)}
              onChange={(e) => update({ ...draft, swing: Number(e.target.value) / 100 })}
            />
          </div>
        )}
      </div>

      <div className="editor-grid pattern-grid">
        {Array.from({ length: bars }, (_, bar) => (
          <div className="grid-bar" key={bar}>
            {bars > 1 && <p className="grid-bar-label">Bar {bar + 1}</p>}
            <ol className="grid-beats">
              {Array.from({ length: draft.beatsPerBar }, (_, beat) => (
                <li className="grid-beat" key={beat}>
                  <ol className="grid-slots">
                    {Array.from({ length: draft.subdivision }, (_, k) => {
                      const slot = beat * draft.subdivision + k
                      const index = bar * perBar + slot
                      const stroke = draft.slots[index]
                      const direction = directionOf(draft, index)
                      const count = countLabel(draft.subdivision, slot)
                      const where = bars > 1 ? `Bar ${bar + 1}, ${count}` : count
                      return (
                        <li key={k} className="editor-slot">
                          <button
                            ref={(el) => {
                              slotRefs.current[index] = el
                            }}
                            className="slot-button"
                            tabIndex={index === focused ? 0 : -1}
                            aria-label={`${where}: ${direction} ${STROKE_NAMES[stroke]}`}
                            onFocus={() => setFocused(index)}
                            onClick={() => cycle(index)}
                            onKeyDown={(e) => onSlotKey(e, index)}
                          >
                            <SlotCell as="span" stroke={stroke} direction={direction} count={count} />
                          </button>
                          {draft.subdivision === 3 && (
                            <button
                              className="direction-button"
                              tabIndex={-1}
                              aria-label={`Flip direction of ${where} (now ${direction})`}
                              onClick={() => flip(index)}
                            >
                              {direction === 'down' ? '↓' : '↑'}
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {problems.map((p) => (
        <p key={p} className="warning" role="alert">
          {p}
        </p>
      ))}

      <div className="editor-buttons">
        <button className="primary" onClick={save}>
          Save
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
      <p className="hint">
        Choose a slot to change it: strum → accent → chuck → miss. <kbd>←</kbd>
        <kbd>→</kbd> move between slots
        {draft.subdivision === 3 && (
          <>
            {' '}
            · <kbd>F</kbd> flips the direction
          </>
        )}{' '}
        · <kbd>Esc</kbd> cancel
      </p>
    </section>
  )
}
