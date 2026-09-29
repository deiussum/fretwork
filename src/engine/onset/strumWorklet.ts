// AudioWorklet entry point. Loaded with `audioWorklet.addModule`; runs on the audio thread.
import type { WorkletCommand, WorkletEvent } from './messages'
import { STRUM_PROCESSOR } from './messages'
import { StrumProcessorCore } from './strumProcessor'

type WorkletScope = {
  sampleRate: number
  currentTime: number
  AudioWorkletProcessor: new () => { readonly port: MessagePort }
  registerProcessor(name: string, processor: new () => unknown): void
}

const scope = globalThis as unknown as WorkletScope

class StrumProcessor extends scope.AudioWorkletProcessor {
  private readonly core = new StrumProcessorCore(scope.sampleRate)

  constructor() {
    super()
    this.port.onmessage = (e: MessageEvent<WorkletCommand>) => this.post(this.core.configure(e.data))
  }

  process(inputs: Float32Array[][]): boolean {
    this.post(this.core.process(inputs[0] ?? [], scope.currentTime))
    return true
  }

  private post(events: WorkletEvent[]) {
    for (const event of events) {
      if (event.type === 'chunk') this.port.postMessage(event, [event.samples.buffer])
      else this.port.postMessage(event)
    }
  }
}

scope.registerProcessor(STRUM_PROCESSOR, StrumProcessor)
