## 1. Preference storage

- [x] 1.1 Add `src/domain/uiPrefs.ts` (`UiPrefs`, default `{ changesHelpOpen: true }`, a localStorage repository under `fretwork.ui.v1` with sanitising, an `available` flag and in-memory fallback). Verify with unit tests: defaults, round-trip, an invalid field falling back, and throwing storage.

## 2. Instructions

- [x] 2.1 Add `src/ui/HowItWorks.tsx` (`<details>`/`<summary>` with the steps, closing line and JustinGuitar credit from design.md) and render it under the setup title. Wire its open state through `ChangesTool` from the repository, saving on toggle, and pass the repository from `main.tsx` through `App`. Verify with jsdom tests:
  - it is open by default and closed when the saved preference says so
  - toggling saves the preference
  - the credit link opens in a new tab with `noopener`
  - the text says "including the first", as the confirm screen does
- [x] 2.2 Make `useSessionKeys` leave Space to a focused `<summary>`. Verify with a jsdom test that Space on the focused summary starts no count-in, and that Space elsewhere on setup still starts one.
- [x] 2.3 Style the section (left-aligned list in a max-width box, readable summary, theme colours). Verify in Chrome in light and dark mode, open and closed, and at 390 px with no horizontal overflow.

## 3. Checks

- [x] 3.1 Verify that `npm test`, `npm run lint`, `npm run build`, `nix flake check` and `openspec validate add-changes-instructions --strict` all pass.
