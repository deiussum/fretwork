/** Greedy nearest matching of detected onsets to labelled ones within a tolerance. */
export function matchOnsets(truth: readonly number[], found: readonly number[], tolerance = 0.05) {
  const used = new Set<number>()
  const errors: number[] = []
  for (const t of truth) {
    let best = -1
    let bestError = Infinity
    found.forEach((f, i) => {
      const error = Math.abs(f - t)
      if (!used.has(i) && error < bestError) {
        best = i
        bestError = error
      }
    })
    if (best >= 0 && bestError <= tolerance) {
      used.add(best)
      errors.push(found[best] - t)
    }
  }
  return {
    matched: errors.length,
    recall: truth.length === 0 ? 1 : errors.length / truth.length,
    precision: found.length === 0 ? (truth.length === 0 ? 1 : 0) : used.size / found.length,
    maxError: errors.length === 0 ? 0 : Math.max(...errors.map(Math.abs)),
  }
}
