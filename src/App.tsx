import { useCallback, useEffect, useState } from 'react'
import { isValidPair, type Chord, type ChordPair } from './domain/chords'
import type { HistoryRepository } from './domain/history'
import type { InputController } from './engine/input/audioInput'
import type { InputRecorder } from './engine/input/inputRecorder'
import type { SessionEngine } from './engine/session'
import { ConfirmScreen } from './ui/ConfirmScreen'
import { CountingPanel } from './ui/CountingPanel'
import { HistoryView } from './ui/HistoryView'
import { ResultScreen } from './ui/ResultScreen'
import { SessionScreen } from './ui/SessionScreen'
import { SetupScreen } from './ui/SetupScreen'
import { useResults } from './ui/useHistory'
import { useInputValue } from './ui/useInput'
import { useSession, useSessionKeys } from './ui/useSession'

type Props = {
  engine: SessionEngine
  history: HistoryRepository
  input: InputController
  recorder?: InputRecorder
}

export default function App({ engine, history, input, recorder }: Props) {
  const state = useSession(engine)
  const [pair, setPair] = useState<[Chord, Chord]>(['A', 'D'])
  const [view, setView] = useState<'practice' | 'history'>('practice')
  const results = useResults(history, state.kind)
  const mode = useInputValue(input, (s) => s.mode)
  const inputStatus = useInputValue(input, (s) => s.status)
  const recordSessions = useInputValue(input, (s) => s.recordSessions)
  const needsGesture = useInputValue(input, (s) => s.needsGesture)

  useEffect(() => {
    void history.loadLastPair().then((last) => {
      if (last) setPair([last[0], last[1]])
    })
  }, [history])

  const blockedReason =
    mode === 'mic' && inputStatus !== 'open' ? 'Mic mode needs a working audio input to start.' : undefined

  const start = useCallback(
    (toStart: ChordPair) => {
      if (mode !== 'mic') {
        void engine.start(toStart)
        return
      }
      // Starting is a user gesture, so it also activates a waiting input.
      if (needsGesture) void input.unlock()
      void engine.start(toStart, {
        onsets: input.onsets,
        recorder: recordSessions ? recorder : undefined,
      })
    },
    [engine, input, mode, needsGesture, recordSessions, recorder],
  )

  const canStart = view === 'practice' && isValidPair(...pair) && !blockedReason
  useSessionKeys(engine, state, canStart ? pair : undefined, blockedReason ? undefined : start)

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
            onStart={() => start(pair)}
            results={results}
            blockedReason={blockedReason}
          >
            <CountingPanel input={input} />
          </SetupScreen>
        )
      break
    case 'countIn':
    case 'running':
      screen = <SessionScreen engine={engine} state={state} />
      break
    case 'confirming':
      screen = <ConfirmScreen engine={engine} state={state} recorder={recorder} />
      break
    case 'result':
      screen = <ResultScreen state={state} recorder={recorder} />
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
