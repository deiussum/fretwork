import { directionOf, slotsPerBar, type Direction, type Pattern, type Stroke, type Subdivision } from '../../domain/strumming'
import type { Beat } from '../metronome/metronome'

/** One slot of a pattern placed on the audio timeline. */
export type ExpectedStroke = {
  /** Audio-clock time of the slot. */
  time: number
  /** Bar of the run (the metronome's bar count; bar 0 is the count-in). */
  bar: number
  /** Bar within the pattern, counting from 0. */
  barInPattern: number
  /** Slot within the bar, counting from 0. */
  slot: number
  stroke: Stroke
  direction: Direction
}

/**
 * Where slot `k` of a beat falls, as a fraction of the beat. Swing moves the
 * second slot of each pair (8th pairs in 16ths, the whole beat in 8ths) from
 * halfway through the pair at 0 to two-thirds of the way at 1.
 */
export function slotFraction(k: number, subdivision: Subdivision, swing: number): number {
  if (subdivision === 3) return k / 3
  const second = 0.5 + swing / 6
  if (subdivision === 2) return k === 0 ? 0 : second
  const pair = Math.floor(k / 2)
  return (pair + (k % 2 === 0 ? 0 : second)) / 2
}

function swingOf(pattern: Pattern): number {
  return pattern.subdivision === 3 ? 0 : pattern.swing
}

/**
 * Every slot of `beat` under `pattern`, misses included. The beat lasts
 * 60 / beat.bpm, the same interval the metronome leaves before the next beat.
 */
export function expandBeat(beat: Beat, pattern: Pattern, barInPattern: number): ExpectedStroke[] {
  const { subdivision } = pattern
  const duration = 60 / beat.bpm
  const strokes: ExpectedStroke[] = []
  for (let k = 0; k < subdivision; k++) {
    const slot = beat.beatInBar * subdivision + k
    const index = barInPattern * slotsPerBar(pattern) + slot
    strokes.push({
      time: beat.time + slotFraction(k, subdivision, swingOf(pattern)) * duration,
      bar: beat.bar,
      barInPattern,
      slot,
      stroke: pattern.slots[index],
      direction: directionOf(pattern, index),
    })
  }
  return strokes
}

/** The slot within the bar that is sounding at `now`, during `beat`. */
export function slotAt(beat: Beat, pattern: Pattern, now: number): number {
  const { subdivision } = pattern
  const fraction = (now - beat.time) / (60 / beat.bpm)
  let k = 0
  while (k + 1 < subdivision && slotFraction(k + 1, subdivision, swingOf(pattern)) <= fraction) k++
  return beat.beatInBar * subdivision + k
}
