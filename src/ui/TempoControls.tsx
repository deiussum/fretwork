import { useId, useState } from 'react'
import type { TrainerSettings } from '../domain/metronomeSettings'
import type { Beat, MetronomeEngine } from '../engine/metronome/metronome'
import { barsUntilNextStep, validateTrainer } from '../engine/metronome/ramp'

/** Speed trainer on/off and its four settings, editable only while stopped. */
export function TrainerControls({ engine, playing }: { engine: MetronomeEngine; playing: boolean }) {
  const { trainerOn, trainer } = engine.getState().settings
  const errors = trainerOn ? validateTrainer(trainer) : {}
  return (
    <fieldset className="trainer" disabled={playing}>
      <label className="checkbox">
        <input type="checkbox" checked={trainerOn} onChange={(e) => engine.setTrainerOn(e.target.checked)} />
        Speed trainer
      </label>
      {trainerOn && (
        <div className="trainer-fields">
          <TrainerField label="Start BPM" field="start" trainer={trainer} engine={engine} error={errors.start} />
          <TrainerField label="Step BPM" field="step" trainer={trainer} engine={engine} error={errors.step} />
          <TrainerField label="Every (bars)" field="every" trainer={trainer} engine={engine} error={errors.every} />
          <TrainerField label="Target BPM" field="target" trainer={trainer} engine={engine} error={errors.target} />
        </div>
      )}
    </fieldset>
  )
}

export function TrainerProgress({ trainer, beat }: { trainer: TrainerSettings; beat: Beat | undefined }) {
  const next = beat ? barsUntilNextStep(beat.bar, trainer) : trainer.every
  return (
    <p className="trainer-progress" data-testid="trainer-progress">
      {trainer.start} → {trainer.target} BPM ·{' '}
      {next === undefined ? 'Target reached' : `Next step in ${next} ${next === 1 ? 'bar' : 'bars'}`}
    </p>
  )
}

export function Stepper(props: { label: string; value: string; onDown: () => void; onUp: () => void }) {
  return (
    <div className="stepper" role="group" aria-label={props.label}>
      <span className="stepper-label">{props.label}</span>
      <button aria-label={`Decrease ${props.label.toLowerCase()}`} onClick={props.onDown}>
        −
      </button>
      <span className="stepper-value">{props.value}</span>
      <button aria-label={`Increase ${props.label.toLowerCase()}`} onClick={props.onUp}>
        +
      </button>
    </div>
  )
}

type TrainerFieldProps = {
  label: string
  field: keyof TrainerSettings
  trainer: TrainerSettings
  engine: MetronomeEngine
  error?: string
}

export function TrainerField({ label, field, trainer, engine, error }: TrainerFieldProps) {
  const id = useId()
  const value = trainer[field]
  // Keep what was typed (e.g. an empty field) while it still matches the setting.
  const [text, setText] = useState(String(value))
  const matches = text.trim() === '' ? Number.isNaN(value) : Number(text) === value
  const shown = matches ? text : String(value)

  return (
    <div className="trainer-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={shown}
        aria-invalid={error !== undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          setText(e.target.value)
          const parsed = e.target.value.trim() === '' ? Number.NaN : Number(e.target.value)
          engine.setTrainer({ ...trainer, [field]: parsed })
        }}
      />
      {error && (
        <p className="warning" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
