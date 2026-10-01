import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ChordPair } from '../domain/chords'
import type { Clock } from '../engine/clock'
import type { SessionEngine, SessionState } from '../engine/session'

export function useSession(engine: SessionEngine): SessionState {
  return useSyncExternalStore(engine.subscribe, engine.getState)
}

/**
 * Keyboard handler for 1 minute changes, installed only while `active`:
 * Space starts (setup/result), Escape aborts or goes back. Enter while
 * confirming is handled by the score form. `start` is undefined when starting
 * isn't currently allowed. Space typed into a text field is left to the field.
 */
export function useSessionKeys(
  engine: SessionEngine,
  state: SessionState,
  selectedPair: ChordPair | undefined,
  start: ((pair: ChordPair) => void) | undefined,
  active = true,
) {
  useEffect(() => {
    if (!active) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const isSpace = e.code === 'Space' || e.key === ' '
      // Let a space be typed into text fields. Other keys still apply, e.g.
      // Escape from the score input discards the attempt.
      if (isSpace && isTextEntry(e.target)) return
      // Space on a focused <details> toggle opens or closes it instead.
      if (isSpace && e.target instanceof Element && e.target.closest('summary')) return
      switch (state.kind) {
        case 'idle':
          if (isSpace) {
            e.preventDefault()
            if (selectedPair && start) start(selectedPair)
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
            if (start) start(state.pair)
          }
          if (e.key === 'Escape') engine.back()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [engine, state, selectedPair, start, active])
}

/**
 * Re-evaluates `read(now)` against the audio clock every animation frame while
 * `active`, re-rendering only when the returned value changes.
 */
export function useClockValue<T>(clock: Clock, active: boolean, read: (now: number) => T): T {
  const [value, setValue] = useState(() => read(clock.now()))
  // Always call the latest `read`, so a frame loop that outlives a state change sees fresh props.
  const readRef = useRef(read)
  useLayoutEffect(() => {
    readRef.current = read
  })
  useEffect(() => {
    if (!active) return
    let frame = 0
    const loop = () => {
      setValue(readRef.current(clock.now()))
      frame = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(frame)
  }, [clock, active])
  return value
}

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit'])

export function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true
  return target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)
}
