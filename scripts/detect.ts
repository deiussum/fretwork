// Detect strums in a WAV file and print them as Audacity point labels.
//
//   npm run detect -- recording.wav [--sensitivity 0.5] [--channel 0] > recording.labels.txt
//
// Import the labels into Audacity (File → Import → Labels) next to the audio,
// fix any wrong ones, and export them again to make a test fixture.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { detectOnsets } from '../src/engine/onset/detector'
import { pointLabels, writeLabels } from '../src/engine/recording/labels'
import { decodeWav } from '../src/engine/recording/wav'

export function detectFile(path: string, options: { sensitivity?: number; channel?: number } = {}): string {
  const { sampleRate, channels } = decodeWav(readFileSync(path))
  const channel = options.channel ?? 0
  if (channel >= channels.length) throw new Error(`${path} has ${channels.length} channel(s); no channel ${channel}`)
  const config = options.sensitivity === undefined ? {} : { sensitivity: options.sensitivity }
  return writeLabels(pointLabels(detectOnsets(channels[channel], sampleRate, config)))
}

function parseArgs(args: string[]) {
  let file: string | undefined
  const options: { sensitivity?: number; channel?: number } = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--sensitivity') options.sensitivity = Number(args[++i])
    else if (arg === '--channel') options.channel = Number(args[++i])
    else if (!arg.startsWith('--')) file = arg
    else throw new Error(`Unknown option ${arg}`)
  }
  if (!file) throw new Error('Usage: npm run detect -- <file.wav> [--sensitivity 0..1] [--channel n]')
  if (options.sensitivity !== undefined && !(options.sensitivity >= 0 && options.sensitivity <= 1)) {
    throw new Error('--sensitivity must be between 0 and 1')
  }
  return { file, options }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { file, options } = parseArgs(process.argv.slice(2))
    process.stdout.write(detectFile(file, options))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
