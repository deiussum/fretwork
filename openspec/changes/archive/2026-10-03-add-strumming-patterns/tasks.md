## 1. Pattern model and storage

- [x] 1.1 Add `domain/strumming.ts`: `Stroke`, `Direction`, the `Pattern` union, `barsOf`, `directionOf`, `validatePattern` (1–12 beats, 1–4 bars, slot and direction lengths, swing 0–1, non-empty name, at least one non-miss, one message per problem), and a slot-notation parser (`x > c .`, `|` between bars) for presets and tests. Verify with unit tests: Old faithful parses to 8 slots, a 2-bar pattern has 2 bars, derived directions for 8ths and 16ths, explicit triplet directions, and each invalid case gives its message.
- [x] 1.2 Add `domain/strummingPresets.ts` with the eight presets from the spec and stable `preset:` ids. Verify with a unit test that every preset passes `validatePattern`, the ids are unique, and Old faithful is the default.
- [x] 1.3 Add `reshapePattern(pattern, change)` for beats per bar, subdivision and bars changes (swing is a plain field the editor sets directly): keep existing strokes, fill new slots with misses, reset triplet directions to down-up-down, and drop swing for triplets. Verify with unit tests, including the spec's 8ths→16ths scenario.
- [x] 1.4 Add the localStorage repositories: `StrummingSettings` under `fretwork.strumming.v1` (bpm 80 default, trainer, trainerOn, guideOn, patternId, field-by-field sanitising) and custom patterns under `fretwork.strumming.patterns.v1` (invalid entries skipped one at a time). Both have an `available` flag. Verify with unit tests for defaults, round-trip, invalid fields or entries, a missing selected pattern falling back to Old faithful, and storage that throws.

## 2. Engine

- [x] 2.1 Implement `engine/strumming/slotTiming.ts`: `slotFraction`, `expandBeat` → `ExpectedStroke[]`, and `slotAt(beat, now)`. Verify with unit tests for the spec's swing scenarios (straight and full-swing 8ths at 120 BPM, swung 16ths at 60 BPM), triplet thirds, and a beat at a changed bpm.
- [x] 2.2 Add the `BeatListener` dependency (`beatScheduled`, `rewound`) and public `rescheduleUpcoming()` to `MetronomeEngine`. Verify that the existing metronome tests pass unchanged, and with new tests that the listener sees every scheduled beat, and that `rewound` fires with the first unsounded beat's time on a tempo change and on stop.
- [x] 2.3 Add the guide `SoundKind`s (`strumDown`, `strumUp`, `strumDownAccent`, `strumUpAccent`, `chuck`) to `sounds.ts` with the tones from the design. Verify that existing tests pass and that `RecordingSounds` records the new kinds.
- [x] 2.4 Implement `StrummingEngine`: owns a `MetronomeEngine` and a guide `SoundScheduler`; count-in bar 0 with no strokes; bar→pattern map fixed at each bar's first beat; guide sounds per non-miss slot; expected stroke timeline with 5 s retention; `position(now)` with countIn, slot, barInPattern and bars; start/stop/toggle and tempo, tap and trainer forwarding. Verify with `FakeClock` + `RecordingSounds` + fake timers: the count-in at 60 BPM is four clicks then bar 1, the Old faithful guide sequence and times at 120 BPM, the expected timeline with the guide off, a 2-bar pattern repeating, and stop silencing everything.
- [x] 2.5 Add live changes: pattern selection while playing (from the next bar, its own beats per bar, restarting at pattern bar 0, even when the next bar is already scheduled under the hidden lookahead), guide toggle (off cancels from now; on schedules upcoming strokes), and tempo or trainer changes rewinding the guide and timeline consistently. Verify with engine tests for each case, including the spec's "switch on the fly" scenario, the trainer ramp scenario (count-in is bar 0 of the ramp), and no duplicated or orphaned guide sounds after a rewind.

## 3. UI

- [x] 3.1 Add Strumming to the app shell's tool switcher. Hide the switcher, home link and footer while the editor is open. Leaving the tool or choosing the home link stops it. Verify with jsdom tests for the app-navigation scenarios (open from the metronome, switch away stops playback, home link stops it, Space starts only the shown tool, no switcher while editing).
- [x] 3.2 Build the player view: a large one-bar grid (stroke glyph, ↓/↑ arrow, count label per slot, distinct looks for hit/accent/chuck/miss), cursor and beat highlight from `position()` per animation frame, the count-in display, "bar N of M" for multi-bar patterns, tempo and speed trainer controls matching the metronome, and a guide toggle. Verify with jsdom tests for count labels (8ths, 16ths, triplets), stroke rendering, and "bar 2 of 2". Check readability from 2 m in the browser with a 16ths pattern.
- [x] 3.3 Build the pattern list: presets then custom patterns; select; Duplicate (all), Edit and Delete (custom only); delete with an in-page confirmation; a "won't be saved" note when storage is unavailable. Verify with jsdom tests for presets being read-only, duplicate naming "(copy)" opening the editor, and deleting the selected pattern selecting Old faithful.
- [x] 3.4 Build the pattern editor: name, beats per bar, subdivision, bars, swing (hidden for triplets), a slot grid with a roving tabindex (arrows move, Space/Enter cycle, F flips triplet direction, plus mouse), Save with validation messages, and Cancel/Escape. Opening it stops playback. Verify with jsdom tests for the cycle order, the empty-pattern refusal, swing hidden for triplets, Escape discarding edits, and opening while playing stopping playback.
- [x] 3.5 Add `useStrummingKeys`: Space, Escape, ↑/↓ (Shift ±5), ←/→ previous/next pattern, T, S (stopped only), G. Inactive while the editor is open or a field has focus (Enter blurs, Escape stops). Verify with jsdom tests for each shortcut, the spec's keyboard scenarios, and Space in the editor not starting playback.
- [x] 3.6 Wire `main.tsx`: two more `WebAudioSounds` (clicks and guide), the strumming metronome with `WorkerTicker` and visibility source, both repositories, and save on change. Verify that the app runs in `npm run dev`, and that after creating a pattern, selecting it at 72 BPM and reloading, it is still selected at 72 BPM.
- [x] 3.7 Update `PrivacyView.tsx`: add custom strumming patterns to "Saved in your browser" and bump `PRIVACY_UPDATED`. Verify with the privacy jsdom test checking the new list item.

## 5. Sound choice (click, guide or both)

- [x] 5.1 Replace `guideOn` with `sound: 'click' | 'guide' | 'both'` (default `'both'`) in `StrummingSettings` and its sanitiser. Verify with unit tests for the default, round-trip and an invalid stored value.
- [x] 5.2 Add the optional `muteClick(beat)` to `BeatListener` and use it in `MetronomeEngine` before scheduling each click. Verify that the metronome tests pass unchanged, and with a test that a muted beat is still announced and kept for `position()` but has no click.
- [x] 5.3 In `StrummingEngine`, replace the guide toggle with `setSound`/`cycleSound`: mute clicks after the count-in for Guide, play the guide for Guide and Both, and apply changes while playing (cancel the guide from now, replay upcoming strokes if the guide is on, then `rescheduleUpcoming`). Verify with engine tests: Guide only (count-in clicks, then no clicks), Click only (no guide), Both→Click and Both→Guide while playing in a hidden tab (no doubles, change from the next beat), and the cycle order.
- [x] 5.4 Replace the guide checkbox with a Click / Guide / Both choice, make G cycle it, and save it in `main.tsx`. Verify with jsdom tests for the choice and the G cycle, and in Chrome that Guide-only playback has count-in clicks and then only guide tones.

## 6. Showing swing

- [x] 6.1 Space each slot of the player grid by its duration from `slotFraction`, so swung slots sit where they sound. Verify with a jsdom test that Shuffle's slots get ⅔ and ⅓ of the beat while Old faithful's get halves, and with a Chromium screenshot.
- [x] 6.2 Show "Swing N%" next to the pattern name on the player and in the pattern list for patterns with swing. Verify with jsdom tests for Shuffle (shown) and Old faithful (not shown).

## 4. End-to-end checks

- [x] 4.1 In Chrome, instrument `OscillatorNode.prototype.start` and check the logged times and frequencies:
  - the count-in is followed by the Old faithful guide at the right times
  - Shuffle's "&" falls at two-thirds of the beat
  - a pattern switch mid-bar takes effect at the next bar
  - turning the guide off stops guide tones within 150 ms while clicks continue

  Remove any test data from `localStorage` afterwards.
- [x] 4.2 Check `npm run build && npx vite preview` for CSP violations while playing a pattern and using the editor.
- [x] 4.3 **(User)** Listen to the guide tones and tune pitches and gains if down/up, accent and chuck aren't easy to tell apart. Play a pattern with the tab hidden for 10 minutes and listen for gaps. Record any issues as follow-up tasks.
- [x] 4.4 Verify that `npm test`, `npm run lint`, `npm run build` and `openspec validate add-strumming-patterns --strict` all pass.
