import type { SessionRecorder } from '../recording/recorder'
import { SessionRecording } from '../recording/sessionRecording'
import type { OnsetSource } from './onsetSource'

type RecordableInput = {
  readonly onsets: OnsetSource
  setCapturing(capturing: boolean): void
  onChunk(listener: (chunk: { startTime: number; samples: Float32Array }) => void): () => void
}

/** Records the input controller's selected channel and raw detections. */
export class InputRecorder implements SessionRecorder {
  private readonly input: RecordableInput
  private readonly sampleRate: () => number
  private recording: SessionRecording | undefined
  /** Wall-clock time the current recording began, for file names. */
  startedAt: Date | undefined
  private unsubscribe: (() => void) | undefined

  constructor(input: RecordableInput, sampleRate: () => number) {
    this.input = input
    this.sampleRate = sampleRate
  }

  /** The last finished recording, if any. */
  get current(): SessionRecording | undefined {
    return this.recording
  }

  begin(from: number, to: number): void {
    this.discard()
    const recording = new SessionRecording(from, to, this.sampleRate())
    const offChunk = this.input.onChunk((chunk) => recording.addChunk(chunk))
    const offOnset = this.input.onsets.subscribe((time) => recording.addOnset(time))
    this.unsubscribe = () => {
      offChunk()
      offOnset()
    }
    this.recording = recording
    this.startedAt = new Date()
    this.input.setCapturing(true)
  }

  end(): void {
    // Stopping capture flushes the last partial chunk asynchronously; stay
    // subscribed so it still lands (anything past `to` is ignored).
    this.input.setCapturing(false)
  }

  discard(): void {
    this.input.setCapturing(false)
    this.unsubscribe?.()
    this.unsubscribe = undefined
    this.recording = undefined
    this.startedAt = undefined
  }
}
