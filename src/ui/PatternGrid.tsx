import type { CSSProperties } from 'react'
import { barsOf, countLabel, directionOf, slotsPerBar, type Pattern, type Stroke } from '../domain/strumming'
import { slotFraction } from '../engine/strumming/slotTiming'
import { STROKE_BADGES, STROKE_NAMES } from './format'

type Props = {
  pattern: Pattern
  /** Bars of the pattern to show, counting from 0. */
  bars: number[]
  /** The slot sounding now, as [bar in pattern, slot in bar]. */
  current?: [number, number]
}

/**
 * A pattern as a grid of slots grouped by beat: stroke, direction and count on
 * each. Within a beat each slot's width is its share of the beat, so swing shows.
 */
export function PatternGrid({ pattern, bars, current }: Props) {
  const perBar = slotsPerBar(pattern)
  const total = barsOf(pattern)
  const swing = pattern.subdivision === 3 ? 0 : pattern.swing
  const starts = Array.from({ length: pattern.subdivision + 1 }, (_, k) =>
    k === pattern.subdivision ? 1 : slotFraction(k, pattern.subdivision, swing),
  )
  return (
    <div className={`pattern-grid player-grid sub-${pattern.subdivision}`}>
      {bars.map((bar) => (
        <div className="grid-bar" key={bar}>
          {total > 1 && (
            <p className="grid-bar-label">
              Bar {bar + 1} of {total}
            </p>
          )}
          <ol className="grid-beats" aria-label={total > 1 ? `Bar ${bar + 1}` : 'Pattern'}>
            {Array.from({ length: pattern.beatsPerBar }, (_, beat) => (
              <li className="grid-beat" key={beat}>
                <ol className="grid-slots" style={{ '--slots': pattern.subdivision } as CSSProperties}>
                  {Array.from({ length: pattern.subdivision }, (_, k) => {
                    const slot = beat * pattern.subdivision + k
                    const index = bar * perBar + slot
                    const isCurrent = current?.[0] === bar && current[1] === slot
                    return (
                      <SlotCell
                        key={k}
                        as="li"
                        stroke={pattern.slots[index]}
                        direction={directionOf(pattern, index)}
                        count={countLabel(pattern.subdivision, slot)}
                        current={isCurrent}
                        share={starts[k + 1] - starts[k]}
                      />
                    )
                  })}
                </ol>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}

type SlotProps = {
  stroke: Stroke
  direction: 'down' | 'up'
  count: string
  current?: boolean
  as: 'li' | 'span'
  /** The slot's share of its beat, for spacing it by time. */
  share?: number
}

/** One slot: stroke mark, direction arrow and count. */
export function SlotCell({ stroke, direction, count, current, as: Tag, share }: SlotProps) {
  return (
    <Tag
      className={`slot ${stroke}${current ? ' current' : ''}`}
      data-stroke={stroke}
      aria-label={Tag === 'li' ? `${count}: ${direction} ${STROKE_NAMES[stroke]}` : undefined}
      aria-current={current ? 'step' : undefined}
      style={share === undefined ? undefined : ({ '--share': share } as CSSProperties)}
    >
      <span className="slot-badge" aria-hidden="true">
        {STROKE_BADGES[stroke]}
      </span>
      <span className="slot-arrow" aria-hidden="true">
        {direction === 'down' ? '↓' : '↑'}
      </span>
      <span className="slot-count" aria-hidden="true">
        {count}
      </span>
    </Tag>
  )
}
