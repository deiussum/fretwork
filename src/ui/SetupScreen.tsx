import { useId, useState, type ReactNode } from 'react'
import { CHORDS, formatPair, normalizeChord, pairError, pairKey, type Chord } from '../domain/chords'
import { chordsInResults, pairStats, type Result } from '../domain/history'

type Props = {
  first: Chord
  second: Chord
  onChange: (first: Chord, second: Chord) => void
  onStart: () => void
  results: Result[]
  /** Counting mode and input setup. */
  children?: ReactNode
  /** Why starting is blocked, if it is (e.g. the audio input was lost). */
  blockedReason?: string
}

export function SetupScreen({ first, second, onChange, onStart, results, children, blockedReason }: Props) {
  const error = pairError(first, second)
  const valid = error === undefined
  const canStart = valid && !blockedReason
  const stats = valid ? pairStats(results, pairKey(first, second)) : {}
  const suggestionsId = useId()
  const suggestions = [...new Set([...CHORDS, ...chordsInResults(results)])]

  return (
    <section className="screen setup">
      <h1>1 Minute Changes</h1>
      <div className="pair-picker">
        <ChordInput label="First chord" value={first} listId={suggestionsId} onChange={(c) => onChange(c, second)} />
        <span className="pair-arrow" aria-hidden>
          ↔
        </span>
        <ChordInput label="Second chord" value={second} listId={suggestionsId} onChange={(c) => onChange(first, c)} />
        <datalist id={suggestionsId}>
          {suggestions.map((chord) => (
            <option key={chord} value={chord} />
          ))}
        </datalist>
      </div>

      {valid ? (
        <dl className="stats">
          <div>
            <dt>Personal best</dt>
            <dd>{stats.best ?? '—'}</dd>
          </div>
          <div>
            <dt>Last time</dt>
            <dd>{stats.previous ?? '—'}</dd>
          </div>
        </dl>
      ) : (
        <p className="warning" role="alert">
          {error}
        </p>
      )}

      {children}

      <button className="primary" disabled={!canStart} onClick={onStart}>
        Start {valid && formatPair([first, second])}
      </button>
      <p className="hint">
        {blockedReason ?? (
          <>
            Press <kbd>Space</kbd> to start
          </>
        )}
      </p>
    </section>
  )
}

type ChordInputProps = {
  label: string
  /** Normalised chord name held by the pair. */
  value: Chord
  /** Id of the shared suggestions `<datalist>`. */
  listId: string
  onChange: (c: Chord) => void
}

function ChordInput({ label, value, listId, onChange }: ChordInputProps) {
  // While typing, show the raw text so spaces aren't trimmed mid-word;
  // otherwise show the pair's normalised name (e.g. after the last pair loads).
  const [draft, setDraft] = useState<string | undefined>(undefined)

  return (
    <label className="chord-select">
      <span>{label}</span>
      <input
        type="text"
        list={listId}
        value={draft ?? value}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => setDraft(value)}
        onBlur={() => setDraft(undefined)}
        onChange={(e) => {
          setDraft(e.target.value)
          onChange(normalizeChord(e.target.value))
        }}
        onKeyDown={(e) => {
          // Confirm the name and hand the keyboard back to Space-to-start.
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </label>
  )
}
