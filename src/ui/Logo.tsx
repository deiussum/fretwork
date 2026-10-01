/**
 * The Fretwork mark ("Inlay"): two frets and a position dot on a rounded
 * tile. public/favicon.svg draws the same shapes; a test keeps them in step.
 */
export const MARK = {
  viewBox: '0 0 32 32',
  tile: { x: 1, y: 1, width: 30, height: 30, rx: 7 },
  frets: [
    { x1: 7, y1: 9.5, x2: 25, y2: 9.5 },
    { x1: 7, y1: 22.5, x2: 25, y2: 22.5 },
  ],
  fretWidth: 3,
  dot: { cx: 16, cy: 16, r: 3.2 },
} as const

/** The mark in the current theme's colours: accent tile, background-coloured frets and dot. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox={MARK.viewBox} aria-hidden="true" focusable="false" className="logo">
      <rect {...MARK.tile} fill="var(--accent)" />
      <g stroke="var(--bg)" strokeWidth={MARK.fretWidth} strokeLinecap="round">
        {MARK.frets.map((fret) => (
          <line key={fret.y1} {...fret} />
        ))}
      </g>
      <circle {...MARK.dot} fill="var(--bg)" />
    </svg>
  )
}

/** The two-tone wordmark: "fret" in the accent colour, "work" in the text colour. */
export function Wordmark() {
  return (
    <span className="wordmark">
      <span className="wordmark-fret">fret</span>work
    </span>
  )
}
