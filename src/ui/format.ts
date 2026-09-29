/** Remaining seconds as M:SS, rounded up so the display reads 1:00 at the start. */
export function formatRemaining(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds - 1e-9))
  const m = Math.floor(whole / 60)
  const s = whole % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
