import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatPair } from '../domain/chords'
import type { InputRecorder } from '../engine/input/inputRecorder'
import { MAX_SCORE, type SessionEngine, type SessionState } from '../engine/session'
import { RecordingDownloads } from './RecordingDownloads'

type ConfirmingState = Extract<SessionState, { kind: 'confirming' }>

type Props = {
  engine: SessionEngine
  state: ConfirmingState
  recorder?: InputRecorder
}

export function ConfirmScreen({ engine, state, recorder }: Props) {
  const [value, setValue] = useState(state.suggestedScore === undefined ? '' : String(state.suggestedScore))
  const inputRef = useRef<HTMLInputElement>(null)

  // Select a prefilled count so typing replaces it and Enter accepts it.
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void engine.submitScore(value)
  }

  return (
    <section className="screen confirm">
      <p className="session-pair">{formatPair(state.pair)}</p>
      <h1>Time!</h1>
      {state.inputLost && (
        <p className="warning" role="alert">
          The audio input was lost during the run, so strums weren't counted. Enter your count.
        </p>
      )}
      <form onSubmit={onSubmit}>
        <label className="score-input">
          <span>How many strums?</span>
          <input
            ref={inputRef}
            inputMode="numeric"
            maxLength={String(MAX_SCORE).length + 2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={state.error ? true : undefined}
            aria-describedby="score-rule"
          />
        </label>
        <p id="score-rule" className="hint">
          {state.detection
            ? `Detected ${state.detection.count} strums. Your score is every strum you played, including the first. Correct it if needed.`
            : 'Your score is every strum you played, including the first.'}
        </p>
        {state.error && (
          <p id="score-error" className="warning" role="alert">
            {state.error}
          </p>
        )}
        <button type="submit" className="primary">
          Save
        </button>
      </form>
      {state.recorded && recorder && <RecordingDownloads recorder={recorder} pair={state.pair} />}
      <p className="hint">
        <kbd>Enter</kbd> to save · <kbd>Esc</kbd> to discard
      </p>
    </section>
  )
}
