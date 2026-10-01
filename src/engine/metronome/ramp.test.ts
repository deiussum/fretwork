import { describe, expect, test } from 'vitest'
import { barsUntilNextStep, isValidTrainer, shiftRamp, tempoForBar, validateTrainer, type TrainerSettings } from './ramp'

const ramp: TrainerSettings = { start: 95, step: 5, every: 4, target: 120 }

describe('tempoForBar', () => {
  test('steps every 4 bars from 95 and holds at 120', () => {
    const tempos = Array.from({ length: 26 }, (_, bar) => tempoForBar(bar, ramp))
    expect(tempos.slice(0, 4)).toEqual([95, 95, 95, 95])
    expect(tempos.slice(4, 8)).toEqual([100, 100, 100, 100])
    expect(tempos[16]).toBe(115)
    expect(tempos[19]).toBe(115)
    expect(tempos.slice(20)).toEqual([120, 120, 120, 120, 120, 120])
  })

  test('clamps a step that would overshoot the target', () => {
    const overshoot = { start: 100, step: 15, every: 1, target: 120 }
    expect([0, 1, 2, 3].map((bar) => tempoForBar(bar, overshoot))).toEqual([100, 115, 120, 120])
  })
})

describe('barsUntilNextStep', () => {
  test('counts down to the next step and is undefined at the target', () => {
    expect(barsUntilNextStep(0, ramp)).toBe(4)
    expect(barsUntilNextStep(4, ramp)).toBe(4)
    expect(barsUntilNextStep(6, ramp)).toBe(2)
    expect(barsUntilNextStep(19, ramp)).toBe(1)
    expect(barsUntilNextStep(20, ramp)).toBeUndefined()
  })
})

describe('shiftRamp', () => {
  test('shifts start and target together', () => {
    expect(shiftRamp(ramp, -5)).toEqual({ trainer: { ...ramp, start: 90, target: 115 }, applied: -5 })
  })

  test('limits the shift so the target stays at most 300', () => {
    const high = { start: 260, step: 5, every: 4, target: 298 }
    expect(shiftRamp(high, 5)).toEqual({ trainer: { ...high, start: 262, target: 300 }, applied: 2 })
  })

  test('limits the shift so the start stays at least 30', () => {
    const low = { start: 32, step: 5, every: 4, target: 60 }
    expect(shiftRamp(low, -5)).toEqual({ trainer: { ...low, start: 30, target: 58 }, applied: -2 })
  })
})

describe('validateTrainer', () => {
  test('accepts the defaults', () => {
    expect(validateTrainer({ start: 80, step: 5, every: 4, target: 120 })).toEqual({})
    expect(isValidTrainer(ramp)).toBe(true)
  })

  test('rejects a target not above the start', () => {
    expect(validateTrainer({ ...ramp, target: 90 })).toEqual({ target: 'Target must be above the start tempo.' })
    expect(validateTrainer({ ...ramp, target: 95 }).target).toBeDefined()
  })

  test('rejects each field out of range or fractional', () => {
    expect(Object.keys(validateTrainer({ ...ramp, start: 29 }))).toEqual(['start'])
    expect(Object.keys(validateTrainer({ ...ramp, target: 301 }))).toEqual(['target'])
    expect(Object.keys(validateTrainer({ ...ramp, step: 0 }))).toEqual(['step'])
    expect(Object.keys(validateTrainer({ ...ramp, step: 51 }))).toEqual(['step'])
    expect(Object.keys(validateTrainer({ ...ramp, every: 0 }))).toEqual(['every'])
    expect(Object.keys(validateTrainer({ ...ramp, every: 65 }))).toEqual(['every'])
    expect(Object.keys(validateTrainer({ ...ramp, step: 2.5 }))).toEqual(['step'])
    expect(Object.keys(validateTrainer({ ...ramp, start: Number.NaN }))).toEqual(['start'])
    expect(isValidTrainer({ ...ramp, every: 0 })).toBe(false)
  })
})
