import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Beat, MetronomeEngine, MetronomeState } from '../engine/metronome/metronome'
import { TapTempo } from '../engine/metronome/tapTempo'
import { isTextEntry } from './useSession'

export function useMetronome(engine: MetronomeEngine): MetronomeState {
  return useSyncExternalStore(engine.subscribe, engine.getState)
}

/**
 * Metronome keyboard shortcuts while the tool is shown: Space start/stop,
 * Escape stop, ↑/↓ tempo ±1 (±5 with Shift), ←/→ beats per bar, T tap tempo,
 * S speed trainer on/off. A focused text or number field keeps its keys,
 * except that Enter leaves the field and Escape stops.
 */
export function useMetronomeKeys(engine: MetronomeEngine) {
  const taps = useRef(new TapTempo())
  useEffect(() => {
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
          engine.nudgeTempo((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : 1))
          break
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault()
          engine.setBeatsPerBar(engine.getState().settings.beatsPerBar + (e.key === 'ArrowRight' ? 1 : -1))
          break
        case 't':
        case 'T': {
          const bpm = taps.current.tap(e.timeStamp / 1000)
          if (bpm !== undefined) engine.setTempo(bpm)
          break
        }
        case 's':
        case 'S':
          engine.setTrainerOn(!engine.getState().settings.trainerOn)
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [engine])
}

/** Increments each time the playing tempo steps up, to restart the flash animation. */
export function useStepFlash(beat: Beat | undefined): number {
  const [state, setState] = useState<{ beat?: Beat; flashes: number }>({ flashes: 0 })
  if (beat !== state.beat) {
    const steppedUp = beat !== undefined && state.beat !== undefined && beat.bpm > state.beat.bpm
    setState({ beat, flashes: state.flashes + (steppedUp ? 1 : 0) })
  }
  return state.flashes
}
