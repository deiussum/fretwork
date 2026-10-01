import { clampBpm } from './ramp'

/** Taps further apart than this start a new measurement. */
const RESET_SEC = 2
/** Average over at most this many intervals. */
const MAX_INTERVALS = 4

/** Turns a series of tap times into a tempo. */
export class TapTempo {
  private taps: number[] = []

  /** Record a tap at `timeSec`; returns the tapped tempo once there are two taps. */
  tap(timeSec: number): number | undefined {
    const last = this.taps[this.taps.length - 1]
    if (last !== undefined && (timeSec - last > RESET_SEC || timeSec <= last)) this.taps = []
    this.taps.push(timeSec)
    if (this.taps.length > MAX_INTERVALS + 1) this.taps.shift()
    if (this.taps.length < 2) return undefined
    const average = (this.taps[this.taps.length - 1] - this.taps[0]) / (this.taps.length - 1)
    return clampBpm(60 / average)
  }
}
