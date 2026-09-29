import { CHORDS, formatPair, isValidPair, pairKey, type Chord } from '../domain/chords'
import { pairStats, type Result } from '../domain/history'

type Props = {
  first: Chord
  second: Chord
  onChange: (first: Chord, second: Chord) => void
  onStart: () => void
  results: Result[]
}

export function SetupScreen({ first, second, onChange, onStart, results }: Props) {
  const valid = isValidPair(first, second)
  const stats = valid ? pairStats(results, pairKey(first, second)) : {}

  return (
    <section className="screen setup">
      <h1>1 Minute Changes</h1>
      <div className="pair-picker">
        <ChordSelect label="First chord" value={first} onChange={(c) => onChange(c, second)} />
        <span className="pair-arrow" aria-hidden>
          ↔
        </span>
        <ChordSelect label="Second chord" value={second} onChange={(c) => onChange(first, c)} />
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
          Pick two different chords.
        </p>
      )}

      <button className="primary" disabled={!valid} onClick={onStart}>
        Start {valid && formatPair([first, second])}
      </button>
      <p className="hint">
        Press <kbd>Space</kbd> to start
      </p>
    </section>
  )
}

function ChordSelect({ label, value, onChange }: { label: string; value: Chord; onChange: (c: Chord) => void }) {
  return (
    <label className="chord-select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {CHORDS.map((chord) => (
          <option key={chord} value={chord}>
            {chord}
          </option>
        ))}
      </select>
    </label>
  )
}
