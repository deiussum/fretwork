import type { Pattern } from '../domain/strumming'
import { PRESET_PATTERNS } from '../domain/strummingPresets'
import type { PatternRepository } from '../domain/strummingSettings'
import type { Clock } from '../engine/clock'
import { RecordingSounds } from '../engine/sounds'
import { StrummingEngine } from '../engine/strumming/strumming'
import { IntervalTicker } from '../engine/ticker'

/** Custom patterns kept in memory. */
export class MemoryPatterns implements PatternRepository {
  available = true
  saved: Pattern[]

  constructor(patterns: Pattern[] = []) {
    this.saved = patterns
  }

  load(): Pattern[] {
    return this.saved
  }

  save(patterns: Pattern[]): void {
    this.saved = patterns
  }
}

/** The strumming tool's dependencies on `clock`, with recording sounds and Old faithful selected. */
export function testStrumming(clock: Clock, custom: Pattern[] = []) {
  const sounds = new RecordingSounds()
  const guide = new RecordingSounds()
  const engine = new StrummingEngine({ clock, sounds, guide, ticker: new IntervalTicker(), pattern: PRESET_PATTERNS[2] })
  return { engine, patterns: new MemoryPatterns(custom), sounds, guide }
}
