import { useEffect, useId, useState } from 'react'
import { barsOf, parseSlots, type Pattern } from '../domain/strumming'
import { DEFAULT_PATTERN_ID, PRESET_PATTERNS } from '../domain/strummingPresets'
import type { PatternRepository, SoundChoice } from '../domain/strummingSettings'
import type { StrummingEngine } from '../engine/strumming/strumming'
import { swingLabel } from './format'
import { PatternEditor } from './PatternEditor'
import { PatternGrid } from './PatternGrid'
import { PatternList } from './PatternList'
import { Stepper, TrainerControls, TrainerProgress } from './TempoControls'
import { useMetronome, useStepFlash } from './useMetronome'
import { useClockValue } from './useSession'
import { useStrumming, useStrummingKeys } from './useStrumming'

type Props = {
  engine: StrummingEngine
  patterns: PatternRepository
  /** Told when the editor opens and closes, so the app can hide its header and footer. */
  onEditingChange?: (editing: boolean) => void
}

type Editing = { pattern: Pattern; title: string }

const SOUND_OPTIONS: { value: SoundChoice; label: string }[] = [
  { value: 'click', label: 'Click' },
  { value: 'guide', label: 'Guide' },
  { value: 'both', label: 'Both' },
]

const newPattern = (): Pattern => ({
  id: crypto.randomUUID(),
  name: 'New pattern',
  beatsPerBar: 4,
  subdivision: 2,
  swing: 0,
  slots: parseSlots('x.x.x.x.'),
})

/** Plays strumming patterns over a metronome, with a pattern list and editor. Stops when it is closed. */
export function StrummingTool({ engine, patterns, onEditingChange }: Props) {
  const { playing, pattern: selected, sound } = useStrumming(engine)
  const { settings } = useMetronome(engine.metronome)
  const [custom, setCustom] = useState(() => patterns.load())
  const [editing, setEditing] = useState<Editing>()
  const soundName = useId()
  useEffect(() => () => engine.stop(), [engine])
  useEffect(() => onEditingChange?.(editing !== undefined), [editing, onEditingChange])

  const all = [...PRESET_PATTERNS, ...custom]
  const selectRelative = (delta: number) => {
    const index = all.findIndex((p) => p.id === selected.id)
    const next = all[Math.max(0, Math.min(all.length - 1, index + delta))]
    if (next) engine.setPattern(next)
  }
  useStrummingKeys(engine, editing === undefined, selectRelative)

  const position = useClockValue(engine, playing, (now) => engine.position(now))
  const current = playing ? position : undefined
  const flash = useStepFlash(current?.beat)

  const openEditor = (pattern: Pattern, title: string) => {
    engine.stop()
    setEditing({ pattern, title })
  }

  const saveCustom = (next: Pattern[]) => {
    setCustom(next)
    patterns.save(next)
  }

  const save = (pattern: Pattern) => {
    const exists = custom.some((p) => p.id === pattern.id)
    saveCustom(exists ? custom.map((p) => (p.id === pattern.id ? pattern : p)) : [...custom, pattern])
    engine.setPattern(pattern)
    setEditing(undefined)
  }

  const remove = (pattern: Pattern) => {
    saveCustom(custom.filter((p) => p.id !== pattern.id))
    if (selected.id === pattern.id) engine.setPattern(PRESET_PATTERNS.find((p) => p.id === DEFAULT_PATTERN_ID)!)
  }

  if (editing) {
    return (
      <PatternEditor
        key={editing.pattern.id}
        initial={editing.pattern}
        title={editing.title}
        onSave={save}
        onCancel={() => setEditing(undefined)}
      />
    )
  }

  const { trainerOn, trainer } = settings
  const tempo = current?.beat.bpm ?? engine.metronome.currentTempo()
  const shown = current?.pattern ?? selected
  const countIn = current?.countIn ?? false
  const beatsPerBar = current?.beat.beatsPerBar ?? selected.beatsPerBar
  const playingBar = current && !countIn ? (current.barInPattern ?? 0) : 0
  const bars = playing ? [playingBar] : Array.from({ length: barsOf(shown) }, (_, i) => i)

  return (
    <section className="screen strumming">
      <h1>Strumming</h1>

      <p className="tempo strumming-tempo" aria-live="off">
        <span key={flash} className={flash > 0 ? 'tempo-number step-flash' : 'tempo-number'} data-testid="tempo">
          {tempo}
        </span>{' '}
        <span className="tempo-unit">BPM</span>
      </p>

      <p className="pattern-title">
        {shown.name}
        {swingLabel(shown) && <> <span className="swing-tag">{swingLabel(shown)}</span></>}
        {countIn && <span className="count-in-label"> · Count-in</span>}
      </p>

      <ol className="beats" aria-label={countIn ? 'Count-in' : `${beatsPerBar} beats per bar`}>
        {Array.from({ length: beatsPerBar }, (_, i) => (
          <li
            key={i}
            className={['beat', i === 0 && beatsPerBar > 1 ? 'accent' : '', current?.beat.beatInBar === i ? 'current' : ''].join(
              ' ',
            )}
            aria-current={current?.beat.beatInBar === i ? 'step' : undefined}
          />
        ))}
      </ol>

      <PatternGrid
        pattern={shown}
        bars={bars}
        current={current && !countIn && current.slot !== undefined ? [playingBar, current.slot] : undefined}
      />

      <div className="metronome-controls">
        <Stepper
          label="Tempo"
          value={`${tempo} BPM`}
          onDown={() => engine.metronome.nudgeTempo(-1)}
          onUp={() => engine.metronome.nudgeTempo(1)}
        />
        <fieldset className="sound-choice">
          <legend>Sound</legend>
          {SOUND_OPTIONS.map(({ value, label }) => (
            <label key={value} className="checkbox">
              <input
                type="radio"
                name={soundName}
                checked={sound === value}
                onChange={() => engine.setSound(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </div>

      <TrainerControls engine={engine.metronome} playing={playing} />
      {trainerOn && playing && <TrainerProgress trainer={trainer} beat={current?.beat} />}

      <button className="primary" disabled={!playing && !engine.metronome.canStart()} onClick={() => engine.toggle()}>
        {playing ? 'Stop' : 'Start'}
      </button>
      <p className="hint">
        <kbd>Space</kbd> start/stop · <kbd>↑</kbd>
        <kbd>↓</kbd> tempo (<kbd>Shift</kbd> ±5) · <kbd>←</kbd>
        <kbd>→</kbd> pattern · <kbd>T</kbd> tap · <kbd>S</kbd> speed trainer · <kbd>G</kbd> sound
      </p>

      <PatternList
        presets={PRESET_PATTERNS}
        custom={custom}
        selectedId={selected.id}
        storageAvailable={patterns.available}
        onSelect={(p) => engine.setPattern(p)}
        onNew={() => openEditor(newPattern(), 'New pattern')}
        onDuplicate={(p) => openEditor({ ...p, id: crypto.randomUUID(), name: `${p.name} (copy)` }, 'New pattern')}
        onEdit={(p) => openEditor(p, 'Edit pattern')}
        onDelete={remove}
      />
    </section>
  )
}
