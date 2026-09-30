## 1. Domain

- [x] 1.1 Expand `CHORDS` in `src/domain/chords.ts` to the list in the chord-pair-selection spec; verify with a `chords.test.ts` case that asserts every spec'd chord is present
- [x] 1.2 Add `normalizeChord`, `chordNameError` and `MAX_CHORD_LENGTH` (12) to `src/domain/chords.ts`; verify with unit tests for trimming, collapsing whitespace, keeping case, empty, `|` and 13-character names
- [x] 1.3 Make `isValidPair` normalise both names and reject names with errors; verify with unit tests (`" Am "`/`"D"` valid, `"Am"`/`" Am"` invalid, `"AM7"`/`"Am7"` valid)
- [x] 1.4 Add `chordsInResults(results)` to `src/domain/history.ts` returning unique chord names from results; verify with a `history.test.ts` case covering duplicates across pairs

## 2. Keyboard handling

- [x] 2.1 In `useSessionKeys` (`src/ui/useSession.ts`), return early without `preventDefault()` when Space comes from a text-entry element; verify with an App UI test that typing a space in a chord field doesn't start a session, and that the existing Escape-discards-score test still passes

## 3. Setup screen

- [x] 3.1 Replace `ChordSelect` in `src/ui/SetupScreen.tsx` with a `ChordInput` text field (local draft state, shared `<datalist>`, length checked by validation rather than `maxLength`) that passes normalised names up; verify with an App UI test that typing `D/F#` and `G` shows the D/F# ↔ G start button
- [x] 3.2 Build the suggestions from `CHORDS` plus `chordsInResults(results)`, without duplicates; verify with a UI test that a chord from a saved result appears once in the datalist options
- [x] 3.3 Show the first applicable name error (enter a chord / `|` not allowed / too long) or "must differ" in the warning; verify with UI tests for each message and a disabled Start button
- [x] 3.4 Blur the chord field on Enter; verify with a UI test that Enter then Space starts the count-in
- [x] 3.5 Adjust `.chord-select` styles in `src/index.css` so the text input keeps the old size and grows to fit names up to 12 characters (`field-sizing: content`, fixed-width fallback)

## 4. Verification

- [x] 4.1 Run `npm test`, `npm run lint` and `npm run build`, all passing
- [x] 4.2 In the dev server, enter `Amadd9` ↔ `D/F#`, run a session, check that the session screen shows the pair readably and that `Amadd9` is suggested afterwards; remove test data from `localStorage`
- [x] 4.3 `openspec validate custom-chord-names --strict` passes
