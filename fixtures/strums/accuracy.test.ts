import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { detectOnsets } from '../../src/engine/onset/detector'
import { readLabels } from '../../src/engine/recording/labels'
import { decodeWav } from '../../src/engine/recording/wav'
import { matchOnsets } from '../../src/test/onsetMatching'

type Fixture = { wav: string; labels: string; kind: 'pickup' | 'mic'; channel?: number }

const dir = dirname(fileURLToPath(import.meta.url))
const fixtures: Fixture[] = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
const TARGETS = { pickup: 0.95, mic: 0.9 } as const

describe('strum detection accuracy on labelled recordings', () => {
  if (fixtures.length === 0) {
    test.skip('no fixtures yet: see fixtures/strums/README.md', () => {})
    return
  }

  test.each(fixtures)('$kind: $wav', (fixture) => {
    const { sampleRate, channels } = decodeWav(readFileSync(join(dir, fixture.wav)))
    const truth = readLabels(readFileSync(join(dir, fixture.labels), 'utf8')).map((l) => l.start)
    const found = detectOnsets(channels[fixture.channel ?? 0], sampleRate)
    const { recall, precision, maxError } = matchOnsets(truth, found)
    console.log(
      `${fixture.wav} (${fixture.kind}): recall ${(recall * 100).toFixed(1)}%, ` +
        `precision ${(precision * 100).toFixed(1)}%, ${found.length} detected / ${truth.length} labelled, ` +
        `max timing error ${(maxError * 1000).toFixed(1)} ms`,
    )
    expect(recall).toBeGreaterThanOrEqual(TARGETS[fixture.kind])
    expect(precision).toBeGreaterThanOrEqual(TARGETS[fixture.kind])
  })
})
