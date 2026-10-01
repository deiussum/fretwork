import { MAX_BPM, MIN_BPM, type TrainerSettings } from '../../domain/metronomeSettings'

export { MAX_BPM, MIN_BPM, type TrainerSettings }

export function clampBpm(bpm: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)))
}

/** Tempo of bar `bar` (counting from 0) of a speed trainer run. */
export function tempoForBar(bar: number, trainer: TrainerSettings): number {
  const { start, step, every, target } = trainer
  return Math.min(target, start + Math.floor(bar / every) * step)
}

/**
 * Bars from the start of `bar` until the next tempo step, or undefined once
 * the target has been reached.
 */
export function barsUntilNextStep(bar: number, trainer: TrainerSettings): number | undefined {
  if (tempoForBar(bar, trainer) >= trainer.target) return undefined
  return trainer.every - (bar % trainer.every)
}

/**
 * Move start and target by `delta` BPM, limited so both stay within
 * MIN_BPM…MAX_BPM. Returns the shifted trainer and the delta actually applied.
 */
export function shiftRamp(trainer: TrainerSettings, delta: number): { trainer: TrainerSettings; applied: number } {
  const applied = Math.min(MAX_BPM - trainer.target, Math.max(MIN_BPM - trainer.start, Math.round(delta)))
  return {
    trainer: { ...trainer, start: trainer.start + applied, target: trainer.target + applied },
    applied,
  }
}

export type TrainerErrors = Partial<Record<keyof TrainerSettings, string>>

const isWhole = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max

/** A message per invalid field; empty when the trainer can run. */
export function validateTrainer(trainer: TrainerSettings): TrainerErrors {
  const errors: TrainerErrors = {}
  if (!isWhole(trainer.start, MIN_BPM, MAX_BPM)) {
    errors.start = `Start tempo must be a whole number from ${MIN_BPM} to ${MAX_BPM}.`
  }
  if (!isWhole(trainer.target, MIN_BPM, MAX_BPM)) {
    errors.target = `Target tempo must be a whole number from ${MIN_BPM} to ${MAX_BPM}.`
  } else if (!errors.start && trainer.target <= trainer.start) {
    errors.target = 'Target must be above the start tempo.'
  }
  if (!isWhole(trainer.step, 1, 50)) errors.step = 'Step must be a whole number from 1 to 50 BPM.'
  if (!isWhole(trainer.every, 1, 64)) errors.every = 'Bars per step must be a whole number from 1 to 64.'
  return errors
}

export function isValidTrainer(trainer: TrainerSettings): boolean {
  return Object.keys(validateTrainer(trainer)).length === 0
}
