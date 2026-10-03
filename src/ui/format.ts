import type { Pattern, Stroke } from '../domain/strumming'

/** Remaining seconds as M:SS, rounded up so the display reads 1:00 at the start. */
export function formatRemaining(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds - 1e-9))
  const m = Math.floor(whole / 60)
  const s = whole % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** How each stroke is named to the player. */
export const STROKE_NAMES: Record<Stroke, string> = { hit: 'strum', accent: 'accent', chuck: 'chuck', miss: 'miss' }

/** The mark shown above a slot's arrow. */
export const STROKE_BADGES: Record<Stroke, string> = { hit: '', accent: '>', chuck: '✕', miss: '' }

/** "Swing 60%" for a swung pattern; undefined when it is straight or in triplets. */
export function swingLabel(pattern: Pattern): string | undefined {
  if (pattern.subdivision === 3 || pattern.swing <= 0) return undefined
  return `Swing ${Math.round(pattern.swing * 100)}%`
}
