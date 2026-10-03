import { useEffect } from 'react'
import type { MetronomeEngine } from '../engine/metronome/metronome'
import { Stepper, TrainerControls, TrainerProgress } from './TempoControls'
import { useMetronome, useMetronomeKeys, useStepFlash } from './useMetronome'
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

      <TrainerControls engine={engine} playing={playing} />

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
