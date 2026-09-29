import type { ChannelOption } from '../../domain/settings'

/** Main thread → worklet. */
export type WorkletCommand = {
  type: 'config'
  sensitivity?: number
  channel?: ChannelOption
  recording?: boolean
}

/** Worklet → main thread. Times are on the AudioContext clock. */
export type WorkletEvent =
  | { type: 'onset'; time: number }
  | { type: 'level'; rms: number; peak: number; channel: number; channelCount: number }
  | { type: 'chunk'; startTime: number; samples: Float32Array }

export const STRUM_PROCESSOR = 'fretwork-strum'
