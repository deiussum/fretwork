import { formatPair } from '../domain/chords'
import type { InputRecorder } from '../engine/input/inputRecorder'
import type { SessionState } from '../engine/session'
import { RecordingDownloads } from './RecordingDownloads'

type ResultState = Extract<SessionState, { kind: 'result' }>

export function ResultScreen({ state, recorder }: { state: ResultState; recorder?: InputRecorder }) {
  const firstTime = state.best === undefined

  return (
    <section className="screen result">
      <p className="session-pair">{formatPair(state.pair)}</p>
      <p className="big-number">{state.score}</p>
      {state.isNewBest && (
        <p className="celebrate">{firstTime ? 'First score for this pair!' : 'New personal best!'}</p>
      )}
      <dl className="stats">
        <div>
          <dt>Previous best</dt>
          <dd>{state.best ?? '—'}</dd>
        </div>
        <div>
          <dt>Last time</dt>
          <dd>{state.previous ?? '—'}</dd>
        </div>
      </dl>
      {state.recorded && recorder && <RecordingDownloads recorder={recorder} pair={state.pair} />}
      <p className="hint">
        <kbd>Space</kbd> to go again · <kbd>Esc</kbd> to change chords
      </p>
    </section>
  )
}
