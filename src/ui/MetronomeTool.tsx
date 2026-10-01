import { useEffect, useId, useState } from 'react'
import type { TrainerSettings } from '../domain/metronomeSettings'
import type { Beat, MetronomeEngine } from '../engine/metronome/metronome'
import { barsUntilNextStep, validateTrainer } from '../engine/metronome/ramp'
import { useMetronome, useMetronomeKeys } from './useMetronome'
import { useClockValue } from './useSession'

/** Standalone metronome with a speed trainer. Stops when it is closed. */
export function MetronomeTool({ engine }: { engine: MetronomeEngine }) {
  const { playing, settings } = useMetronome(engine)
  useMetronomeKeys(engine)
  useEffect(() => () => engine.stop(), [engine])

  const beat = useClockValue(engine, playing, (now) => engine.beatAt(now))
  const current = playing ? beat : undefined
  const flash = useStepFlash(current)

  const { trainerOn, trainer } = settings
  const errors = trainerOn ? validateTrainer(trainer) : {}
  const tempo = current?.bpm ?? engine.currentTempo()
  const beatsPerBar = current?.beatsPerBar ?? settings.beatsPerBar

  return (
    <section className="screen metronome">
      <h1>Metronome</h1>

      <p className="tempo" aria-live="off">
        <span key={flash} className={flash > 0 ? 'tempo-number step-flash' : 'tempo-number'} data-testid="tempo">
          {tempo}
        </span>{' '}
        <span className="tempo-unit">BPM</span>
      </p>

      <ol className="beats" aria-label={`${beatsPerBar} beats per bar`}>
        {Array.from({ length: beatsPerBar }, (_, i) => (
          <li
            key={i}
            className={[
              'beat',
              i === 0 && beatsPerBar > 1 ? 'accent' : '',
              current?.beatInBar === i ? 'current' : '',
            ].join(' ')}
            aria-current={current?.beatInBar === i ? 'step' : undefined}
          />
        ))}
      </ol>

      <div className="metronome-controls">
        <Stepper
          label="Tempo"
          value={`${tempo} BPM`}
          onDown={() => engine.nudgeTempo(-1)}
          onUp={() => engine.nudgeTempo(1)}
        />
        <Stepper
          label="Beats per bar"
          value={String(settings.beatsPerBar)}
          onDown={() => engine.setBeatsPerBar(settings.beatsPerBar - 1)}
          onUp={() => engine.setBeatsPerBar(settings.beatsPerBar + 1)}
        />
      </div>

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

      {trainerOn && playing && <TrainerProgress trainer={trainer} beat={current} />}

      <button className="primary" disabled={!playing && !engine.canStart()} onClick={() => engine.toggle()}>
        {playing ? 'Stop' : 'Start'}
      </button>
      <p className="hint">
        <kbd>Space</kbd> start/stop · <kbd>↑</kbd>
        <kbd>↓</kbd> tempo (<kbd>Shift</kbd> ±5) · <kbd>←</kbd>
        <kbd>→</kbd> beats per bar · <kbd>T</kbd> tap · <kbd>S</kbd> speed trainer
      </p>
    </section>
  )
}

/** Increments each time the playing tempo steps up, to restart the flash animation. */
function useStepFlash(beat: Beat | undefined): number {
  const [state, setState] = useState<{ beat?: Beat; flashes: number }>({ flashes: 0 })
  if (beat !== state.beat) {
    const steppedUp = beat !== undefined && state.beat !== undefined && beat.bpm > state.beat.bpm
    setState({ beat, flashes: state.flashes + (steppedUp ? 1 : 0) })
  }
  return state.flashes
}

function TrainerProgress({ trainer, beat }: { trainer: TrainerSettings; beat: Beat | undefined }) {
  const next = beat ? barsUntilNextStep(beat.bar, trainer) : trainer.every
  return (
    <p className="trainer-progress" data-testid="trainer-progress">
      {trainer.start} → {trainer.target} BPM ·{' '}
      {next === undefined ? 'Target reached' : `Next step in ${next} ${next === 1 ? 'bar' : 'bars'}`}
    </p>
  )
}

function Stepper(props: { label: string; value: string; onDown: () => void; onUp: () => void }) {
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

function TrainerField({ label, field, trainer, engine, error }: TrainerFieldProps) {
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
