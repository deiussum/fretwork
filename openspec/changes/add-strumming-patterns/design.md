## Context

See proposal.md for the motivation and specs/ for the behaviour.

`MetronomeEngine` (`src/engine/metronome/metronome.ts`) is a lookahead scheduler driven by an injected `Ticker`. On each tick it schedules `Beat`s (`time`, `bar`, `beatInBar`, `beatsPerBar`, `bpm`) up to 100 ms ahead (1.5 s while the tab is hidden). The interval after a beat is `60 / beat.bpm`. The beats per bar is fixed when a bar's first beat is scheduled. A live change (tempo, ramp shift, beats per bar) *reschedules*: it cancels every beat that hasn't sounded with `SoundScheduler.cancelFrom(time)`, rewinds to that beat and schedules again. The engine knows nothing about subdivisions.

`SoundScheduler`/`WebAudioSounds` synthesises a fixed set of `SoundKind`s with oscillators. `cancelAll` and `cancelFrom` act only on what that instance scheduled. Each tool already has its own instance on the shared `AudioContext`.

## Goals / Non-Goals

**Goals:**
- Reuse the metronome's scheduler, speed trainer, tap tempo and background-tab handling without copying them.
- One pure function decides when every slot happens. Playback, the cursor and later scoring all use it.
- Keep the strumming engine framework-free and testable with `FakeClock`, `RecordingSounds` and fake timers.

**Non-Goals:**
- Scoring, onset matching or practice history for patterns (the timeline is only kept ready for them).
- Changing the standalone metronome's behaviour or spec.
- Sample-based or realistic guitar sounds. The guide uses the same oscillator synthesis as the click.

## Decisions

### 1. Pattern model: a discriminated union in `src/domain/strumming.ts`

```ts
type Stroke = 'hit' | 'accent' | 'chuck' | 'miss'
type Direction = 'down' | 'up'

type PatternBase = { id: string; name: string; beatsPerBar: number; slots: Stroke[] }
type StraightPattern = PatternBase & { subdivision: 2 | 4; swing: number }      // swing 0..1
type TripletPattern = PatternBase & { subdivision: 3; directions: Direction[] } // same length as slots
type Pattern = StraightPattern | TripletPattern
```

- `slots` is flat: `bars × beatsPerBar × subdivision`. The bar count is `slots.length / (beatsPerBar × subdivision)` and is not stored, so it can't disagree with the slots.
- `directionOf(pattern, slotInBar)` returns the stored direction for triplets, and down for even or up for odd slots otherwise.
- The type makes "triplets have directions, straight patterns have swing" true by construction. `validatePattern` checks the rest (lengths, 1–12 beats, 1–4 bars, a non-empty name, at least one non-miss) and gives one message per problem. The editor and the storage sanitiser both use it.
- Presets live in code (`strummingPresets.ts`) with stable ids (`preset:old-faithful`, …). Custom patterns get `crypto.randomUUID()` ids. A short slot notation parser (`x > c .`, `|` between bars) makes presets and tests read like the spec.

**Alternative considered:** store a direction on every slot. That's more general, but it allows straight patterns whose directions contradict continuous motion, and it puts a direction control on every slot in the editor for no benefit.

### 2. Slot timing is one pure function (`src/engine/strumming/slotTiming.ts`)

```
slotFraction(k, subdivision, swing):        // position of slot k within its beat, 0..1
  subdivision 3:  k / 3
  subdivision 2:  k = 0 → 0;  k = 1 → 0.5 + swing/6
  subdivision 4:  pair = floor(k/2);  second = k % 2
                  (pair + (second ? 0.5 + swing/6 : 0)) / 2

expandBeat(beat: Beat, pattern, barInPattern) → ExpectedStroke[]
  for k in 0..subdivision-1:
    slot = beat.beatInBar × subdivision + k
    stroke = pattern.slots[barInPattern × slotsPerBar + slot]
    time = beat.time + slotFraction(k, …) × 60 / beat.bpm
    → { time, bar, slot, stroke, direction }   (misses included, flagged)
```

`60 / beat.bpm` is exactly the interval the metronome uses after that beat. Slot times therefore stay correct across tempo changes and speed trainer steps without the strumming code knowing about either. The cursor uses the inverse (`slotAt(beat, now)`) on the same fractions.

This function is the seam for scoring later: `ExpectedStroke` already carries everything an onset matcher needs.

### 3. Composition: `StrummingEngine` drives its own `MetronomeEngine` through a beat hook

`MetronomeEngine` gets an optional `BeatListener` dependency with two callbacks:

```ts
interface BeatListener {
  beatScheduled(beat: Beat): void   // after each beat is scheduled
  rewound(fromTime: number): void   // before beats from fromTime on are rescheduled (and on stop)
  muteClick?(beat: Beat): boolean   // asked before each click is scheduled; true schedules the beat silently
}
```

It also gets a public `rescheduleUpcoming()`, which runs the existing private `reschedule()`. Those are the only metronome changes, and the standalone metronome passes no listener.

`StrummingEngine` (`src/engine/strumming/strumming.ts`) owns a `MetronomeEngine` instance and a separate guide `SoundScheduler`, and forwards tempo, tap, trainer and start/stop commands to it.
- **Count-in:** bar 0 of the metronome run is the count-in. It has no strokes and the cursor shows the beat. Pattern bars start at bar 1, so the count-in is naturally bar 0 of the speed trainer's ramp.
- **Bar → pattern map:** when `beatScheduled` gets a beat with `beatInBar === 0` and `bar ≥ 1`, the engine fixes `{ pattern, barInPattern }` for that bar. It uses the selected pattern and either continues it or restarts it at bar 0 of the pattern if the selection changed. Later beats in the bar look the map up. This mirrors how the metronome fixes the beats per bar per bar.
- **Rewind:** `rewound(t)` cancels guide sounds from `t` (`guide.cancelFrom(t)`), drops expected strokes at or after `t`, and drops map entries for bars whose first beat is at or after `t`. A bar already under way keeps its pattern, as the metronome keeps its length.
- **Changing pattern while playing:** set the selection, call `metronome.setBeatsPerBar(pattern.beatsPerBar)` (which applies from the next bar), then `metronome.rescheduleUpcoming()`. Beats already scheduled for the next bar (up to 1.5 s ahead while hidden) are re-emitted, and the new pattern takes the next bar.
- **Sound choice (Click / Guide / Both):** clicks after the count-in are muted through `muteClick` (bar ≥ 1 and the choice is Guide), so the beat timeline, trainer and cursor are unaffected. The count-in never mutes. A change while playing runs three steps:
  1. `guide.cancelFrom(now)`.
  2. If the guide is now on, schedule guide sounds for strokes in the timeline later than `now + 10 ms`.
  3. `metronome.rescheduleUpcoming()`, so beats already queued (up to 1.5 s while hidden) are scheduled again with or without their click. This also rewinds and re-expands the guide from the next beat, so step 2 leaves no duplicates.

  Clicks change from the next unsounded beat and guide tones from now, both well within 150 ms.

  **Alternative considered:** a gating `SoundScheduler` wrapper around the clicks. It only sees `(kind, time)`, not the bar, and the click for a bar's first beat is scheduled before the listener learns of that bar, so it can't tell count-in clicks from pattern clicks without duplicating the metronome's tempo arithmetic.
- **Expected stroke timeline:** strokes are appended as beats are scheduled. Ones more than 5 s in the past are dropped (a retention constant scoring can raise). `expectedStrokes()` exposes them. Misses are kept out of the public list but are used by the cursor.
- **Position for the UI:** `position(now)` returns the metronome's `Position` plus `countIn`, `slot`, `barInPattern` and `bars`. React reads it once per animation frame through `useClockValue`, like the metronome.

**Alternatives considered:**
- *Extend `MetronomeEngine` with subdivisions and patterns:* this would make the metronome much more complex and need changes to its spec. The hook keeps it a metronome.
- *A separate scheduler loop sharing `ramp.ts`:* this would copy the lookahead, hidden-tab, reschedule and generation-guard logic that took the most care to get right.
- *Have the metronome call `expandBeat` itself:* it would then need to know about patterns. The listener keeps the dependency one-way.

### 4. Separate settings, separate sounds

- `StrummingSettings = { bpm, trainerOn, trainer, sound, patternId }` (`sound` is `'click' | 'guide' | 'both'`, default `'both'`), stored under `fretwork.strumming.v1` with field-by-field sanitising in the style of `metronomeSettings.ts`. The default bpm is 80. The beats per bar isn't stored, since it comes from the pattern. The strumming engine's metronome instance is built from these settings, and changes are saved through its `subscribe`.
- Custom patterns are stored as a list under `fretwork.strumming.patterns.v1`. Each entry is checked with `validatePattern`, and invalid entries are skipped one at a time. The repository has the same `available` flag. When it's false, patterns are kept in memory and the UI shows "won't be saved".
- `main.tsx` creates two more `WebAudioSounds` instances on the shared context: one for the strumming metronome's clicks and one for the guide. Guide cancellation then never touches clicks, and leaving the tool can `cancelAll` both.

### 5. Guide sound kinds

New `SoundKind`s, all short oscillator tones in `sounds.ts`:

| Kind | Tone | Gain |
|---|---|---|
| `strumDown` | 660 Hz, 40 ms | 0.45 |
| `strumUp` | 880 Hz, 40 ms | 0.45 |
| `strumDownAccent` / `strumUpAccent` | same pitch, 60 ms | 0.9 |
| `chuck` | 220 Hz, 15 ms, fast decay | 0.7 |

These are clear of the click (1000 Hz), the accent click (1800 Hz) and the changes sounds. The values are starting points, to tune by ear in task 4.

### 6. UI structure

`StrummingTool` holds three views: the player (grid + transport), the pattern list (beside or below the grid) and the editor (which replaces the player while open). The app shell hides the switcher and footer while the editor is open, through a callback in the same way `ChangesTool` reports a session in progress.
- **Grid:** one large bar at a time, with slots as cells showing the stroke glyph, a ↓/↑ arrow and the count label. 16 slots at 2 m means the grid fills the content width, with a strong cursor colour and stroke shapes rather than thin text.
- **Editor:** a working copy of the pattern. Slots are buttons in a roving-tabindex grid: arrows move, Space or Enter cycles the stroke, F flips direction (triplets). Structure changes go through a pure `reshapePattern(pattern, change)` that keeps existing strokes, fills new slots with misses and resets triplet directions. Save runs `validatePattern`.
- **Keys:** a `useStrummingKeys` hook, modelled on `useMetronomeKeys`, that is active only when the tool is shown and the editor is closed.

## Risks / Trade-offs

- **Guide tones and future mic scoring** → every slot playing a tone through speakers is a much heavier load on "ignore the app's own sounds" than one click per beat. Scoring will probably need headphones, guide-off, or using the expected stroke timeline to mask known guide times. This is left to the scoring change. The timeline already gives exact times.
- **Pattern change during a 1.5 s hidden lookahead** → covered by `rescheduleUpcoming()`. Tab-hidden pattern changes can't happen anyway, since there are no key events while hidden.
- **Rewind correctness** → the map/timeline/guide trimming in `rewound` is the trickiest part. Engine tests cover a tempo change mid-bar, a pattern change with the next bar already scheduled, a beats-per-bar change via pattern switch, and a guide toggle around a rewind.
- **Readability of 16 slots at 2 m** → if a full 16ths bar is too small on narrow screens, the grid may wrap onto two rows of 8. This is a layout decision for task 3 and doesn't change the spec.
- **Oscillator count** → 16ths at 300 BPM is 20 guide tones/s, so at most about 30 pending in the hidden lookahead. That's trivial for Web Audio.

## Migration Plan

New storage keys only. Existing keys and data are untouched, and removing the feature leaves orphaned keys that do no harm. The privacy statement and `PRIVACY_UPDATED` are updated in the same change. No CSP change.
