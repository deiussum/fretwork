import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ChordPair } from '../domain/chords'
import type { SessionEngine, SessionState } from '../engine/session'

export function useSession(engine: SessionEngine): SessionState {
  return useSyncExternalStore(engine.subscribe, engine.getState)
}

/**
 * The single global keyboard handler: Space starts (setup/result), Escape
 * aborts or goes back. Enter while confirming is handled by the score form.
 */
export function useSessionKeys(engine: SessionEngine, state: SessionState, selectedPair: ChordPair | undefined) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const isSpace = e.code === 'Space' || e.key === ' '
      switch (state.kind) {
        case 'idle':
          if (isSpace) {
            e.preventDefault()
            if (selectedPair) void engine.start(selectedPair)
          }
          break
        case 'countIn':
        case 'running':
          if (isSpace) e.preventDefault()
          if (e.key === 'Escape') engine.abort()
          break
        case 'confirming':
          if (e.key === 'Escape') engine.back()
          break
        case 'result':
          if (isSpace) {
            e.preventDefault()
            void engine.start(state.pair)
          }
          if (e.key === 'Escape') engine.back()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [engine, state, selectedPair])
}

/**
 * Re-evaluates `read(now)` against the engine clock every animation frame while
 * `active`, re-rendering only when the returned value changes.
 */
export function useClockValue<T>(engine: SessionEngine, active: boolean, read: (now: number) => T): T {
  const [value, setValue] = useState(() => read(engine.now()))
  // Always call the latest `read`, so a frame loop that outlives a state change sees fresh props.
  const readRef = useRef(read)
  useLayoutEffect(() => {
    readRef.current = read
  })
  useEffect(() => {
    if (!active) return
    let frame = 0
    const loop = () => {
      setValue(readRef.current(engine.now()))
      frame = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(frame)
  }, [engine, active])
  return value
}
