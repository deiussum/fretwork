import { ChannelSelector } from './channelSelector'
import { OnsetDetector } from './detector'
import type { WorkletCommand, WorkletEvent } from './messages'

const LEVEL_INTERVAL_SEC = 0.033
const CHUNK_SAMPLES = 4096

/**
 * Everything the strum worklet does, minus the AudioWorklet plumbing, so it
 * can be tested in Node: channel selection, detection, level metering and
 * recording taps. `process` is called once per render quantum.
 */
export class StrumProcessorCore {
  private readonly sampleRate: number
  private readonly selector: ChannelSelector
  private readonly detector: OnsetDetector
  private readonly levelInterval: number
  private levelSamples = 0
  private levelSum = 0
  private levelPeak = 0
  private recording = false
  private chunk: Float32Array | undefined
  private chunkFill = 0
  private chunkStart = 0

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate
    this.selector = new ChannelSelector(sampleRate)
    this.detector = new OnsetDetector(sampleRate)
    this.levelInterval = Math.round(LEVEL_INTERVAL_SEC * sampleRate)
  }

  configure(command: WorkletCommand): WorkletEvent[] {
    if (command.sensitivity !== undefined) this.detector.setSensitivity(command.sensitivity)
    if (command.channel !== undefined) this.selector.option = command.channel
    const events: WorkletEvent[] = []
    if (command.recording !== undefined && command.recording !== this.recording) {
      if (!command.recording) this.flushChunk(events)
      this.recording = command.recording
    }
    return events
  }

  /** `time` is the audio-clock time of the first sample in the block. */
  process(channels: readonly Float32Array[], time: number): WorkletEvent[] {
    const events: WorkletEvent[] = []
    if (channels.length === 0 || channels[0].length === 0) return events
    const index = this.selector.update(channels)
    const data = channels[index]

    for (const onset of this.detector.process(data, time)) events.push({ type: 'onset', time: onset })

    for (let i = 0; i < data.length; i++) {
      const v = data[i]
      this.levelSum += v * v
      this.levelPeak = Math.max(this.levelPeak, Math.abs(v))
      if (++this.levelSamples >= this.levelInterval) {
        events.push({
          type: 'level',
          rms: Math.sqrt(this.levelSum / this.levelSamples),
          peak: this.levelPeak,
          channel: index,
          channelCount: channels.length,
        })
        this.levelSamples = 0
        this.levelSum = 0
        this.levelPeak = 0
      }
    }

    if (this.recording) this.record(data, time, events)
    return events
  }

  private record(data: Float32Array, time: number, events: WorkletEvent[]) {
    let offset = 0
    while (offset < data.length) {
      if (!this.chunk) {
        this.chunk = new Float32Array(CHUNK_SAMPLES)
        this.chunkFill = 0
        this.chunkStart = time + offset / this.sampleRate
      }
      const count = Math.min(data.length - offset, CHUNK_SAMPLES - this.chunkFill)
      this.chunk.set(data.subarray(offset, offset + count), this.chunkFill)
      this.chunkFill += count
      offset += count
      if (this.chunkFill === CHUNK_SAMPLES) this.flushChunk(events)
    }
  }

  private flushChunk(events: WorkletEvent[]) {
    if (this.chunk && this.chunkFill > 0) {
      events.push({ type: 'chunk', startTime: this.chunkStart, samples: this.chunk.slice(0, this.chunkFill) })
    }
    this.chunk = undefined
    this.chunkFill = 0
  }
}
