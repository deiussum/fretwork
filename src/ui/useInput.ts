import { useSyncExternalStore } from 'react'
import type { InputController, InputState } from '../engine/input/audioInput'

/** Subscribe to one value of the input state; re-renders only when it changes. */
export function useInputValue<T>(input: InputController, select: (state: InputState) => T): T {
  return useSyncExternalStore(input.subscribe, () => select(input.getState()))
}

export function useInputState(input: InputController): InputState {
  return useSyncExternalStore(input.subscribe, input.getState)
}
