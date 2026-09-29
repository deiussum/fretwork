export type OnsetSourceStatus = 'open' | 'lost'

/** A stream of detected strum times on the session's audio clock. */
export interface OnsetSource {
  readonly status: OnsetSourceStatus
  subscribe(listener: (time: number) => void): () => void
  onStatus(listener: (status: OnsetSourceStatus) => void): () => void
}

/** An OnsetSource you push onsets and status changes into (used by InputController and tests). */
export class OnsetEmitter implements OnsetSource {
  status: OnsetSourceStatus = 'open'
  private readonly onsetListeners = new Set<(time: number) => void>()
  private readonly statusListeners = new Set<(status: OnsetSourceStatus) => void>()

  get listenerCount(): number {
    return this.onsetListeners.size
  }

  subscribe(listener: (time: number) => void): () => void {
    this.onsetListeners.add(listener)
    return () => this.onsetListeners.delete(listener)
  }

  onStatus(listener: (status: OnsetSourceStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  emit(time: number): void {
    for (const listener of this.onsetListeners) listener(time)
  }

  setStatus(status: OnsetSourceStatus): void {
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }
}
