import workletUrl from '../onset/strumWorklet.ts?worker&url'
import { STRUM_PROCESSOR, type WorkletEvent } from '../onset/messages'
import type { ProcessorHandle } from './audioInput'

const loaded = new WeakMap<BaseAudioContext, Promise<void>>()

/**
 * Connects a media stream to the strum worklet. The node has no outputs and
 * nothing is connected to the speakers, so the input is never played back.
 */
export async function createStrumProcessor(ctx: AudioContext, stream: MediaStream): Promise<ProcessorHandle> {
  let loading = loaded.get(ctx)
  if (!loading) {
    loading = ctx.audioWorklet.addModule(workletUrl)
    loaded.set(ctx, loading)
  }
  await loading

  const source = ctx.createMediaStreamSource(stream)
  const node = new AudioWorkletNode(ctx, STRUM_PROCESSOR, {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    channelCount: 2,
    channelCountMode: 'max',
  })
  source.connect(node)
  return {
    post: (command) => node.port.postMessage(command),
    onEvent: (listener) => {
      node.port.onmessage = (e: MessageEvent<WorkletEvent>) => listener(e.data)
    },
    disconnect: () => {
      node.port.onmessage = null
      source.disconnect()
      node.disconnect()
    },
  }
}
