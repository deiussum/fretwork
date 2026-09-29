/** One Audacity label; a point label has `end === start`. Times in seconds. */
export type Label = { start: number; end: number; text: string }

/** Write labels in Audacity's label-track text format (`start\tend\ttext`). */
export function writeLabels(labels: readonly Label[]): string {
  return labels.map((l) => `${l.start.toFixed(6)}\t${l.end.toFixed(6)}\t${l.text}\n`).join('')
}

/** Point labels at each time, e.g. one per detected strum. */
export function pointLabels(times: readonly number[], text = 'strum'): Label[] {
  return times.map((t) => ({ start: t, end: t, text }))
}

/**
 * Parse an Audacity label file. Ignores blank lines and the `\` lines Audacity
 * writes for spectral selections.
 */
export function readLabels(content: string): Label[] {
  const labels: Label[] = []
  for (const line of content.split(/\r?\n/)) {
    if (line.trim() === '' || line.startsWith('\\')) continue
    const [start, end, ...text] = line.split('\t')
    const s = Number(start)
    const e = Number(end)
    if (!Number.isFinite(s) || !Number.isFinite(e)) throw new Error(`Invalid label line: ${JSON.stringify(line)}`)
    labels.push({ start: s, end: e, text: text.join('\t') })
  }
  return labels
}
