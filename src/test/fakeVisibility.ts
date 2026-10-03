import type { VisibilitySource } from '../engine/metronome/metronome'

/** A page visibility source that tests can hide and show. */
export class FakeVisibility implements VisibilitySource {
  isHidden = false
  private readonly listeners = new Set<() => void>()
  hidden() {
    return this.isHidden
  }
  onChange(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  set(hidden: boolean) {
    this.isHidden = hidden
    for (const l of this.listeners) l()
  }
}
