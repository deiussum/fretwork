import { useState } from 'react'
import { formatSlots, type Pattern } from '../domain/strumming'
import { swingLabel } from './format'

type Props = {
  presets: readonly Pattern[]
  custom: readonly Pattern[]
  selectedId: string
  /** False when custom patterns can't be saved in this browser. */
  storageAvailable: boolean
  onSelect: (pattern: Pattern) => void
  onNew: () => void
  onDuplicate: (pattern: Pattern) => void
  onEdit: (pattern: Pattern) => void
  onDelete: (pattern: Pattern) => void
}

/** Presets, then the player's own patterns, with actions for the selected one. */
export function PatternList(props: Props) {
  const { presets, custom, selectedId } = props
  const [confirming, setConfirming] = useState<string>()
  const selected = [...presets, ...custom].find((p) => p.id === selectedId)
  const isCustom = custom.some((p) => p.id === selectedId)

  const item = (p: Pattern) => (
    <li key={p.id}>
      <button
        className="pattern-item"
        aria-pressed={p.id === selectedId}
        onClick={() => {
          setConfirming(undefined)
          props.onSelect(p)
        }}
      >
        <span className="pattern-name">
          {p.name}
          {swingLabel(p) && <> <span className="swing-tag">{swingLabel(p)}</span></>}
        </span>
        <span className="pattern-notation" aria-hidden="true">
          {formatSlots(p)}
        </span>
      </button>
    </li>
  )

  return (
    <section className="pattern-list" aria-label="Patterns">
      <h2>Patterns</h2>
      <ul aria-label="Presets">{presets.map(item)}</ul>
      {custom.length > 0 && <ul aria-label="Your patterns">{custom.map(item)}</ul>}

      {selected && confirming === selected.id ? (
        <div className="pattern-actions" role="group" aria-label="Confirm delete">
          <span>Delete “{selected.name}”?</span>
          <button
            className="danger"
            onClick={() => {
              setConfirming(undefined)
              props.onDelete(selected)
            }}
          >
            Delete
          </button>
          <button onClick={() => setConfirming(undefined)}>Cancel</button>
        </div>
      ) : (
        <div className="pattern-actions">
          <button onClick={props.onNew}>New</button>
          {selected && <button onClick={() => props.onDuplicate(selected)}>Duplicate</button>}
          {selected && isCustom && <button onClick={() => props.onEdit(selected)}>Edit</button>}
          {selected && isCustom && <button onClick={() => setConfirming(selected.id)}>Delete</button>}
        </div>
      )}
      {!props.storageAvailable && (
        <p className="hint">This browser isn’t saving data, so your patterns will be lost when you leave the page.</p>
      )}
    </section>
  )
}
