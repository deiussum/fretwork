## Why

The 1 minute changes setup screen assumes players already know the exercise. Newcomers don't know they should strum each chord once and alternate, or how the score is counted. The app counts every strum including the first, while some descriptions of the exercise count changes, so the rule needs stating. Short instructions on the setup screen fix that without getting in the way of regular players.

## What Changes

- Add a collapsible **How it works** section to the 1 minute changes setup screen, under the title. It covers:
  - choosing a pair
  - the count-in and "go" sound
  - strumming each chord once and alternating
  - the counting rule (every strum, including the first; Mic mode counts for you)
  - where results are kept

  It credits the exercise as popularised by JustinGuitar, with a link.
- It is open on first visit. Whether the player opens or closes it is remembered between visits, in browser storage.
- When the toggle has keyboard focus, Space opens or closes it instead of starting a session.
- Not included:
  - instructions for the metronome
  - changes to session, confirmation or result screens

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `change-session`: the setup screen gains the instructions requirement, and the keyboard requirement gains the rule that Space on the focused instructions toggle opens or closes it. The existing keyboard requirement is otherwise unchanged; the new rule is part of the added requirement.

## Impact

- `src/ui/`: a `HowItWorks` component on the setup screen.
- `src/domain/`: a small UI preferences repository (`fretwork.ui.v1`) holding whether the instructions are open.
- `src/ui/useSession.ts`: Space on a focused `<summary>` is left to the browser.
- `src/index.css`: styles.
- The privacy page's "Saved in your browser" list already covers settings, so its wording and date need no change.
