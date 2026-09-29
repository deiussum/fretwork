import { describe, expect, test } from 'vitest'
import { ChannelSelector } from './channelSelector'

const SR = 48000
const block = (amplitude: number) => Float32Array.from({ length: 128 }, (_, i) => amplitude * Math.sin(i / 3))

/** Feed `seconds` of constant-level audio per channel; return the final selection. */
function feed(selector: ChannelSelector, amplitudes: number[], seconds: number) {
  let selected = -1
  for (let n = 0; n < (seconds * SR) / 128; n++) selected = selector.update(amplitudes.map(block))
  return selected
}

describe('ChannelSelector', () => {
  test('auto follows the louder channel', () => {
    const selector = new ChannelSelector(SR)
    expect(feed(selector, [0.001, 0.5], 3)).toBe(1)
    expect(feed(selector, [0.5, 0.001], 5)).toBe(0)
  })

  test('auto does not switch for differences under 6 dB', () => {
    const selector = new ChannelSelector(SR)
    expect(feed(selector, [0.3, 0.001], 3)).toBe(0)
    // Channel 1 is now ~3.5 dB louder: stays on channel 0.
    expect(feed(selector, [0.3, 0.45], 5)).toBe(0)
    // ~10 dB louder: switches.
    expect(feed(selector, [0.3, 0.95], 5)).toBe(1)
  })

  test('fixed options use that channel regardless of level', () => {
    const selector = new ChannelSelector(SR)
    selector.option = 0
    expect(feed(selector, [0.001, 0.9], 2)).toBe(0)
    selector.option = 1
    expect(feed(selector, [0.9, 0.001], 2)).toBe(1)
  })

  test('mono input always uses channel 0', () => {
    const selector = new ChannelSelector(SR)
    selector.option = 1
    expect(feed(selector, [0.5], 1)).toBe(0)
  })
})
