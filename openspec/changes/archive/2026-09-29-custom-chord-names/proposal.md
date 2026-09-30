## Why

Chord selection is limited to 15 built-in open chords, so players can't practise changes involving chords like D/F#, Amadd9, Bm or Cadd9. The data model already stores chord names as plain strings. Only the setup picker holds players to the fixed list.

## What Changes

- Each chord slot on the setup screen becomes a type-ahead text field instead of a fixed dropdown. The player can enter any chord symbol (e.g. `D/F#`, `Amadd9`).
- The field suggests the built-in chords plus every chord name found in saved results, so a name used before is picked rather than retyped. This keeps one spelling per chord and avoids splitting history.
- Chord names are cleaned up before use: surrounding whitespace is trimmed, inner runs of whitespace are collapsed to one space, and case is kept (`AM7` and `Am7` are different chords). Empty names, names containing `|` and names longer than 12 characters are rejected with a message.
- The built-in list grows with common chords: B, Bm, F, Cadd9, Dsus2, Dsus4, Asus2, Asus4, Em7, G/B.
- Global keyboard shortcuts (Space to start, Escape to go back) no longer fire while the player is typing in a text field. Enter in a chord field confirms the name and leaves the field, so the next Space starts the session.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `chord-pair-selection`: the built-in list becomes a set of suggestions rather than a limit; custom chord names, name rules and suggestions from history are added; the built-in list is expanded.
- `change-session`: keyboard-driven control ignores shortcuts while a text field has focus.

## Impact

- `src/domain/chords.ts`: expanded `CHORDS`, a new chord-name normalisation and validation helper, `isValidPair` uses it.
- `src/domain/history.ts`: helper that collects chord names used in results.
- `src/ui/SetupScreen.tsx`: `<select>` replaced by a text input backed by a `<datalist>`.
- `src/ui/useSession.ts`: key handler skips events coming from editable fields.
- No storage migration: stored results and the last pair are already plain strings.
