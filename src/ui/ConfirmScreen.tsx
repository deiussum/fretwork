import { useState, type FormEvent } from 'react'
import { formatPair } from '../domain/chords'
import { MAX_SCORE, type SessionEngine, type SessionState } from '../engine/session'

type ConfirmingState = Extract<SessionState, { kind: 'confirming' }>

export function ConfirmScreen({ engine, state }: { engine: SessionEngine; state: ConfirmingState }) {
  const [value, setValue] = useState(state.suggestedScore === undefined ? '' : String(state.suggestedScore))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void engine.submitScore(value)
  }

  return (
    <section className="screen confirm">
      <p className="session-pair">{formatPair(state.pair)}</p>
      <h1>Time!</h1>
      <form onSubmit={onSubmit}>
        <label className="score-input">
          <span>How many changes?</span>
          <input
            autoFocus
            inputMode="numeric"
            maxLength={String(MAX_SCORE).length + 2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? 'score-error' : undefined}
          />
        </label>
        {state.error && (
          <p id="score-error" className="warning" role="alert">
            {state.error}
          </p>
        )}
        <button type="submit" className="primary">
          Save
        </button>
      </form>
      <p className="hint">
        <kbd>Enter</kbd> to save · <kbd>Esc</kbd> to discard
      </p>
    </section>
  )
}
