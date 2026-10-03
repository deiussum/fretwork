import { defaultTripletDirections, parseSlots, type Pattern } from './strumming'

const straight = (id: string, name: string, slots: string, subdivision: 2 | 4 = 2, swing = 0): Pattern => ({
  id: `preset:${id}`,
  name,
  beatsPerBar: 4,
  subdivision,
  swing,
  slots: parseSlots(slots),
})

const tripletSlots = parseSlots('xxxxxxxxxxxx')

/** Built-in patterns; they can be duplicated but not edited or deleted. */
export const PRESET_PATTERNS: readonly Pattern[] = [
  straight('quarter-downs', 'Quarter downs', 'x.x.x.x.'),
  straight('down-ups', 'Down-ups', 'xxxxxxxx'),
  straight('old-faithful', 'Old faithful', 'x.xx.xxx'),
  straight('backbeat-chuck', 'Backbeat chuck', 'x.cxx.cx'),
  straight('reggae-skank', 'Reggae skank', '.c.c.c.c'),
  straight('shuffle', 'Shuffle', 'x.xx.xxx', 2, 1),
  straight('folk-16ths', 'Folk 16ths', 'x.xxx.xxx.xxx.xx', 4),
  {
    id: 'preset:triplet-dud',
    name: 'Triplet down-up-down',
    beatsPerBar: 4,
    subdivision: 3,
    slots: tripletSlots,
    directions: defaultTripletDirections(tripletSlots.length),
  },
]

export const DEFAULT_PATTERN_ID = 'preset:old-faithful'

export function isPreset(id: string): boolean {
  return PRESET_PATTERNS.some((p) => p.id === id)
}
