import { formatPair } from '../domain/chords'
import type { SessionEngine, SessionState } from '../engine/session'
import { formatRemaining } from './format'
import { useClockValue } from './useSession'

type TimedState = Extract<SessionState, { kind: 'countIn' | 'running' }>

/** Count-in and run display, driven by the engine's audio clock. */
export function SessionScreen({ engine, state }: { engine: SessionEngine; state: TimedState }) {
  const { countInBeats, beatSec } = engine.config
  const display = useClockValue(engine, true, (now) => {
    if (state.kind === 'countIn') {
      const beat = Math.floor((now - state.firstBeatTime) / beatSec)
      return String(Math.min(countInBeats, Math.max(1, countInBeats - beat)))
    }
    return formatRemaining(state.endTime - now)
  })

  return (
    <section className={`screen session ${state.kind}`}>
      <p className="session-pair">{formatPair(state.pair)}</p>
      <p className="big-number" aria-live="off">
        {display}
      </p>
      <p className="hint">
        {state.kind === 'countIn' ? 'Get ready… ' : ''}
        <kbd>Esc</kbd> to stop
      </p>
    </section>
  )
}
