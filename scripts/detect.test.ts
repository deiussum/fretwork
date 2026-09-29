import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, expect, test } from 'vitest'
import { readLabels } from '../src/engine/recording/labels'
import { encodeWav } from '../src/engine/recording/wav'
import { strumTimes, synthStrums } from '../src/test/synthStrums'

const dir = mkdtempSync(join(tmpdir(), 'fretwork-detect-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

test('npm run detect prints one Audacity label per strum in a WAV', () => {
  const times = strumTimes(12, 0.9)
  const wavPath = join(dir, 'strums.wav')
  writeFileSync(wavPath, encodeWav(synthStrums({ duration: 12, strums: times.map((time) => ({ time })) }), 48000))

  const output = execFileSync('npx', ['tsx', 'scripts/detect.ts', wavPath, '--sensitivity', '0.5'], { encoding: 'utf8' })
  const labels = readLabels(output)
  expect(labels).toHaveLength(12)
  labels.forEach((label, i) => expect(Math.abs(label.start - times[i])).toBeLessThan(0.02))
}, 30000)
