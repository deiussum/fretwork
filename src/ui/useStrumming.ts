import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { TapTempo } from '../engine/metronome/tapTempo'
import type { StrummingEngine, StrummingState } from '../engine/strumming/strumming'
import { isTextEntry } from './useSession'

export function useStrumming(engine: StrummingEngine): StrummingState {
  return useSyncExternalStore(engine.subscribe, engine.getState)
}

/**
 * Strumming keyboard shortcuts while the player is shown: Space start/stop,
 * Escape stop, ↑/↓ tempo ±1 (±5 with Shift), ←/→ previous/next pattern,
 * T tap tempo, S speed trainer on/off, G cycles the sound (both, guide,
 * click). Off while `active` is false (the editor is open). A focused text or number field keeps its keys,
 * except that Enter leaves the field and Escape stops.
 */
export function useStrummingKeys(engine: StrummingEngine, active: boolean, selectRelative: (delta: number) => void) {
  const taps = useRef(new TapTempo())
  const select = useRef(selectRelative)
  useLayoutEffect(() => {
    select.current = selectRelative
  })
  useEffect(() => {
    if (!active) return
    const { metronome } = engine
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTextEntry(e.target)) {
        if (e.key === 'Enter') (e.target as HTMLElement).blur()
        if (e.key === 'Escape') engine.stop()
        return
      }
      const isArrow = e.key.startsWith('Arrow')
      if (e.repeat && !isArrow) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          engine.toggle()
          break
        case 'Escape':
          engine.stop()
          break
        case 'ArrowUp':
        case 'ArrowDown':
          e.preventDefault()
          metronome.nudgeTempo((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : 1))
          break
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault()
          select.current(e.key === 'ArrowRight' ? 1 : -1)
          break
        case 't':
        case 'T': {
          const bpm = taps.current.tap(e.timeStamp / 1000)
          if (bpm !== undefined) metronome.setTempo(bpm)
          break
        }
        case 's':
        case 'S':
          metronome.setTrainerOn(!metronome.getState().settings.trainerOn)
          break
        case 'g':
        case 'G':
          engine.cycleSound()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [engine, active])
}
