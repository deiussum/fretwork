import { useEffect, useState } from 'react'
import { isValidPair, type Chord } from './domain/chords'
import type { HistoryRepository } from './domain/history'
import type { SessionEngine } from './engine/session'
import { ConfirmScreen } from './ui/ConfirmScreen'
import { HistoryView } from './ui/HistoryView'
import { ResultScreen } from './ui/ResultScreen'
import { SessionScreen } from './ui/SessionScreen'
import { SetupScreen } from './ui/SetupScreen'
import { useResults } from './ui/useHistory'
import { useSession, useSessionKeys } from './ui/useSession'

type Props = {
  engine: SessionEngine
  history: HistoryRepository
}

export default function App({ engine, history }: Props) {
  const state = useSession(engine)
  const [pair, setPair] = useState<[Chord, Chord]>(['A', 'D'])
  const [view, setView] = useState<'practice' | 'history'>('practice')
  const results = useResults(history, state.kind)

  useEffect(() => {
    void history.loadLastPair().then((last) => {
      if (last) setPair([last[0], last[1]])
    })
  }, [history])

  const canStart = view === 'practice' && isValidPair(...pair)
  useSessionKeys(engine, state, canStart ? pair : undefined)

  let screen
  switch (state.kind) {
    case 'idle':
      screen =
        view === 'history' ? (
          <HistoryView results={results} />
        ) : (
          <SetupScreen
            first={pair[0]}
            second={pair[1]}
            onChange={(a, b) => setPair([a, b])}
            onStart={() => void engine.start(pair)}
            results={results}
          />
        )
      break
    case 'countIn':
    case 'running':
      screen = <SessionScreen engine={engine} state={state} />
      break
    case 'confirming':
      screen = <ConfirmScreen engine={engine} state={state} />
      break
    case 'result':
      screen = <ResultScreen state={state} />
      break
  }

  return (
    <div className="app">
      {!history.available && (
        <p className="notice" role="status">
          Browser storage is unavailable, so results won't be saved after you close this page.
        </p>
      )}
      {state.kind === 'idle' && (
        <nav className="tabs">
          <button aria-pressed={view === 'practice'} onClick={() => setView('practice')}>
            Practice
          </button>
          <button aria-pressed={view === 'history'} onClick={() => setView('history')}>
            History
          </button>
        </nav>
      )}
      <main>{screen}</main>
    </div>
  )
}
