## 1. Project setup

- [x] 1.1 Scaffold a Vite `react-ts` project at the repo root with strict TypeScript. Verify that `npm run dev` serves the page and `npm run build` succeeds.
- [x] 1.2 Add Vitest (with jsdom for UI tests) and a `test` script. Verify that `npm test` runs a placeholder test and it passes.
- [x] 1.3 Create the `src/engine`, `src/domain` and `src/ui` folders following design.md, and add a `.gitignore` for `node_modules`/`dist`. Verify that the build still succeeds.

## 2. Domain: chords and pairs

- [x] 2.1 Implement the built-in chord list in `domain/chords.ts`. Verify with a unit test that every chord required by the chord-pair-selection spec is present.
- [x] 2.2 Implement `pairKey(a, b)` (order-independent) and a same-chord validation helper. Verify with unit tests that `pairKey('D','A') === pairKey('A','D')` and that identical chords are rejected.

## 3. Domain: history

- [x] 3.1 Define the `Result` type and the `HistoryRepository` interface, including `method` and optional `detectedScore`. Verify that it type-checks with `tsc --noEmit`.
- [x] 3.2 Implement the `localStorage` repository under the key `guitar.oneMinuteChanges.v1`, with a version field and `lastPair`. Verify with unit tests that results round-trip and survive a fresh repository instance.
- [x] 3.3 Implement degraded mode for when storage throws. Verify with a unit test that a throwing storage stub doesn't throw to callers and reports `available: false`.
- [x] 3.4 Implement the personal best, previous score and per-pair summary (best, latest, count, last date) computations. Verify with unit tests using the spec scenarios, including a pair with no history returning no values rather than zero.

## 4. Engine: clock and sounds

- [x] 4.1 Implement the `Clock` interface with an `AudioContext`-backed implementation and a manual fake clock for tests. Verify that the fake clock advances deterministically in a unit test.
- [x] 4.2 Implement a `SoundScheduler` that synthesises click, go and end sounds at absolute times and can cancel everything scheduled, plus a recording fake. Verify with a unit test that the fake records scheduled times and a cancellation.

## 5. Engine: session state machine

- [x] 5.1 Implement the session engine states (`idle`, `countIn`, `running`, `confirming`, `result`) with `getState`/`subscribe`. Verify with a unit test of the initial state and listener notification.
- [x] 5.2 Implement `start(pair)`: resume audio, schedule 4 clicks, go and end at `t0 + 0..3`, `t0 + 4` and `t0 + 64`, and poll for transitions. Verify with fake-clock tests that the exact scheduled times are correct and that the countIn → running → confirming transitions happen at `goTime`/`endTime`.
- [x] 5.3 Implement `abort()` during countIn and running. Verify with tests that scheduled sounds are cancelled, the state returns to idle with the pair kept, and nothing is saved.
- [x] 5.4 Implement `submitScore(n)`, with validation for whole numbers 0–999, saving a `manual` result, and moving to `result` with the previous score, PB and a new-PB flag. Also implement `discard()`. Verify with tests covering valid, invalid (-3, 1000, non-numeric) and discard cases.
- [x] 5.5 Support an optional `suggestedScore` in the `confirming` state (unused for now). Verify with a test that it is exposed when provided.
- [x] 5.6 Ignore start commands while a session is in progress. Verify with a test that `start()` during countIn or running changes nothing.

## 6. UI

- [x] 6.1 Add a `useSession` hook that wraps the engine via `useSyncExternalStore`, plus a single global keydown handler (Space, Escape, Enter per state, preventing the default Space scroll). Verify with a jsdom test that Space in idle calls `start`.
- [x] 6.2 Build the setup screen: two chord selects, same-chord warning, start disabled while invalid, last pair preselected, PB/previous shown for the current pair. Verify manually in the browser and with a jsdom test for the same-chord warning.
- [x] 6.3 Build the count-in and run screens: large count-in number, then an M:SS countdown and the pair, driven by rAF reading `clock.now()`, large enough to read at about 2 m. Verify manually that the display and sounds stay in step.
- [x] 6.4 Build the score confirmation screen: auto-focused numeric input, prefill support, inline validation message, Enter to save, Escape to discard. Verify with a jsdom test for invalid input and manually in the browser.
- [x] 6.5 Build the result screen: score, previous, PB and a new-PB indication, with Space to repeat and Escape to return to setup. Verify manually by running two sessions on the same pair.
- [x] 6.6 Build the history view: a per-pair summary table (best, latest, attempts, last date) that expands to show results newest first. Verify manually after saving results for two pairs.
- [x] 6.7 Show a "results won't be saved" notice when the repository is in degraded mode. Verify by blocking site storage in the browser and confirming that sessions still run.

## 7. End-to-end check

- [x] 7.1 Do a full manual run-through with a guitar: select a pair, Space, count-in, run, end sound, enter score, reload, and check the history and PB. Also confirm by ear that the count-in is steady while the page is busy. Record any issues found as follow-up tasks.
- [x] 7.2 Verify that `npm test`, `npm run build` and `openspec validate one-minute-changes-timer --strict` all pass.
