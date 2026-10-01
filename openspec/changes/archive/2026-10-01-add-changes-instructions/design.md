## Context

See proposal.md for the motivation and the spec delta for the behaviour.

`SetupScreen` renders the title, the pair picker, stats, the counting panel and the start button. `useSessionKeys` starts a session on Space unless the event target is text entry (`isTextEntry`). Stored settings use small `localStorage` repositories with field-by-field sanitising and an `available` flag, for example `LocalStorageSettings` (`fretwork.settings.v1`) and `LocalStorageMetronomeSettings` (`fretwork.metronome.v1`). The confirm screen's counting text is "Your score is every strum you played, including the first."

## Goals / Non-Goals

**Goals:**
- Instructions a newcomer reads once and a regular can ignore.
- The same counting rule as the confirm screen.
- No effect on keyboard flow or on the session screens.

**Non-Goals:**
- Metronome help.
- Tours or overlays.
- Showing the instructions anywhere other than setup.

## Decisions

### 1. Native `<details>`/`<summary>`

`HowItWorks` renders `<details className="how-it-works" open={open} onToggle=…>`, with a `<summary>How it works</summary>` and an ordered list of steps. Using the native element gives keyboard and screen-reader behaviour, and the expand/collapse state, without custom ARIA. `onToggle` reports the new open state to the parent, which saves it.

It sits under the `<h1>` in `SetupScreen`, before the pair picker, and is left-aligned inside a max-width box so the steps read as a list.

### 2. The text

1. Pick two chords you find awkward to switch between.
2. Press **Space**. After four clicks and a higher "go" sound, strum the first chord once, switch, strum the second once, and keep alternating.
3. Keep going until the end sound, one minute later. Make each chord ring clean before you strum; accuracy first, speed follows.
4. Enter how many strums you played, including the first. In Mic mode the app counts them for you.

A closing line follows: "A few minutes a day on your trickiest pairs builds speed fast. Your best and latest score for each pair are kept under History." After that comes the credit: "One minute changes is an exercise popularised by [JustinGuitar](https://www.justinguitar.com/)", with `target="_blank" rel="noopener noreferrer"`. Like the GitHub link, it is user-initiated navigation, so the CSP and privacy statement are unaffected.

Step 4 uses the same rule as the confirm screen. A test checks that both say "including the first", so they stay in step.

### 3. A small UI preferences repository

`src/domain/uiPrefs.ts` adds `UiPrefs { changesHelpOpen: boolean }`, with a default of `true`, stored under `fretwork.ui.v1`. It follows the existing settings pattern: sanitise each field on load, keep an `available` flag, and keep settings in memory when storage throws. `main.tsx` creates it and passes it through `App` to `ChangesTool`, which holds the open state in React state, initialised from the repository, and saves on toggle.

**Alternative considered:** adding the field to `InputSettings`. Those are audio-input settings, and mixing UI state in would muddy the type and its sanitiser.

### 4. Space on a focused `<summary>`

`useSessionKeys` currently starts a session on Space whenever the target isn't text entry. A focused `<summary>` would then both toggle and start a session. The handler also returns early when the event target is (or is inside) a `<summary>`. The browser then toggles the section and no session starts.

This is the narrowest fix. Other focused buttons keep their current behaviour, which this change doesn't alter.

## Risks / Trade-offs

- **[Trade-off]** The instructions push the pair picker down while open. → They're collapsible, and closing them is remembered.
- **[Risk]** The counting text could drift from the confirm screen. → The consistency test in decision 2.
