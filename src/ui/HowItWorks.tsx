import type { SyntheticEvent } from 'react'

export const JUSTIN_GUITAR_URL = 'https://www.justinguitar.com/'

/** Collapsible instructions for 1 minute changes, shown on the setup screen. */
export function HowItWorks({ open, onToggle }: { open: boolean; onToggle: (open: boolean) => void }) {
  const toggled = (e: SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open !== open) onToggle(e.currentTarget.open)
  }

  return (
    <details className="how-it-works" open={open} onToggle={toggled}>
      <summary>How it works</summary>
      <ol>
        <li>Pick two chords you find awkward to switch between.</li>
        <li>
          Press <kbd>Space</kbd>. After four clicks and a higher “go” sound, strum the first chord once, switch, strum
          the second once, and keep alternating.
        </li>
        <li>
          Keep going until the end sound, one minute later. Make each chord ring clean before you strum; accuracy first,
          speed follows.
        </li>
        <li>
          Enter how many strums you played, including the first. In Mic mode the app counts them for you.
        </li>
      </ol>
      <p>
        A few minutes a day on your trickiest pairs builds speed fast. Your best and latest score for each pair are kept
        under History.
      </p>
      <p className="credit">
        One minute changes is an exercise popularised by{' '}
        <a href={JUSTIN_GUITAR_URL} target="_blank" rel="noopener noreferrer">
          JustinGuitar
        </a>
        .
      </p>
    </details>
  )
}
