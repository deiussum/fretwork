import type { ChannelOption } from '../../domain/settings'

/**
 * Picks which input channel to analyse. A fixed option always uses that
 * channel (clamped to what exists). Auto follows the channel with the
 * stronger smoothed level, switching only when another channel is louder by
 * more than `hysteresisDb`, so it doesn't flip-flop between similar levels.
 */
export class ChannelSelector {
  option: ChannelOption = 'auto'
  private selected = 0
  private levels: number[] = []
  private readonly smoothing: number
  private readonly hysteresis: number

  constructor(sampleRate: number, { windowSec = 1, hysteresisDb = 6 } = {}) {
    // Per-sample exponential smoothing of mean-square level, time constant windowSec.
    this.smoothing = Math.exp(-1 / (windowSec * sampleRate))
    this.hysteresis = 10 ** (hysteresisDb / 10) // ratio of mean-square levels
  }

  /** Update levels with a block of channel data; returns the channel to use. */
  update(channels: readonly ArrayLike<number>[]): number {
    const count = channels.length
    if (count === 0) return 0
    if (this.levels.length !== count) this.levels = new Array<number>(count).fill(0)
    for (let c = 0; c < count; c++) {
      const data = channels[c]
      let level = this.levels[c]
      for (let i = 0; i < data.length; i++) {
        level = this.smoothing * level + (1 - this.smoothing) * data[i] * data[i]
      }
      this.levels[c] = level
    }

    if (this.option !== 'auto') {
      this.selected = Math.min(this.option, count - 1)
      return this.selected
    }
    if (this.selected >= count) this.selected = 0
    let loudest = this.selected
    for (let c = 0; c < count; c++) if (this.levels[c] > this.levels[loudest]) loudest = c
    if (loudest !== this.selected && this.levels[loudest] > this.levels[this.selected] * this.hysteresis) {
      this.selected = loudest
    }
    return this.selected
  }
}
