## Context

`Chord` is already `string`. `pairKey`, `Result.chords`, `loadLastPair`/`saveLastPair`, `pairStats` and the history view all work with any string. The only thing that limits chords to `CHORDS` is the `<select>` in `SetupScreen.tsx`. The session key handler in `useSession.ts` listens on `window` and, in the idle state, calls `preventDefault()` on Space and starts a session. It does this whatever element has focus.

## Goals / Non-Goals

**Goals:**
- Free-text chord names with suggestions, without changing storage.
- One spelling per chord in practice, through suggestions rather than parsing.

**Non-Goals:**
- Parsing or checking chord symbols (e.g. treating `Am(add9)` as `Amadd9`, or rejecting `Xyz`).
- Renaming, merging or hiding chord names that are already in history.
- Showing `#`/`b` as `♯`/`♭`.
- A styled custom combobox component.

## Decisions

### Native `<input list>` + `<datalist>` for the picker
Each slot is an `<input type="text">` bound to a shared `<datalist>` of suggestions. Browsers provide the filtering, the arrow-key navigation and free entry.
- *Alternative:* a custom ARIA combobox. It would look the same in every browser and be fully testable, but it's far more code. The setup screen is read up close, so the plain browser look is fine. It can be swapped in later without touching the domain code.
- *Alternative:* "Custom…" in the existing select, which reveals a text box. That means two controls per slot and a clumsy keyboard flow.

### Normalisation in the domain layer
Add `normalizeChord(raw): string` (trim, collapse whitespace) and `chordNameError(name): string | undefined` (empty / contains `|` / longer than 12) to `src/domain/chords.ts`. `isValidPair` normalises both names, requires no error on either, and requires them to differ. `MAX_CHORD_LENGTH = 12` is enforced by validation, not by the input's `maxLength`. A `maxLength` would silently truncate pasted names, and the player would never see the "too long" message the spec asks for.
- *Why keep case:* case carries meaning in chord symbols (`Am7` minor 7 vs `AM7` major 7).
- *Why reject `|` rather than change `pairKey`:* `|` has no use in chord symbols, and keeping the key format leaves stored keys valid.

### Draft text lives in the field; the pair holds normalised names
`ChordInput` keeps the raw text the player types as local state, so typing "Am add9" isn't cut short by trimming mid-word. On each change it passes `normalizeChord(draft)` up to `App`, which holds the pair. The pair in `App` therefore always holds normalised names, and validity, stats and the Start button update as the player types. When `value` changes from outside (e.g. the last pair loads), the draft resets to it unless the field has focus.

### Suggestions from history
Add `chordsInResults(results): Chord[]` to `src/domain/history.ts`. `SetupScreen` combines `CHORDS` and `chordsInResults(results)` without duplicates, built-ins first, and uses that list for the datalist. No new storage.

### Key handler lets Space through to text fields
At the top of the `useSessionKeys` handler, if the key is Space and `e.target` is a text-entry element (`textarea`, or an `input` whose type accepts text), return without `preventDefault()`, so the space is typed normally. Other keys are unchanged. The confirm screen depends on this: its score input has no Escape handler of its own, and discarding a score works because the global handler still catches Escape while that input has focus. Selects in the counting panel are not text-entry elements, so Space on them still starts a session, as it does today.
- *Alternative:* ignore every key from any editable element. Rejected because it breaks Escape on the confirm screen.

In `ChordInput`, Enter calls `blur()` on the input. Escape in the idle state has no session action, so the browser's default in the field is unaffected.

### Messages for invalid names
The setup screen's existing warning (`Pick two different chords.`) becomes the first error that applies: a problem with either slot's name ("Enter a chord", "Chord names can't contain |", "Chord names can be at most 12 characters"), otherwise the "must differ" message.

## Risks / Trade-offs

- [Datalist filtering differs between browsers (substring vs prefix)] → Acceptable. Either way the player finds the chord.
- [A typo that's saved in a result becomes a permanent suggestion] → Only happens once a session with it is completed. History editing is out of scope.
- [Changing the key handler could affect other screens] → Only Space from text-entry elements is exempted. The existing App UI tests cover Space and Escape on every screen.
- [Long names at session size] → The 12-character cap keeps a pair to at most about 27 characters, which fits the `session-pair` clamp at desktop widths. Check it visually.
