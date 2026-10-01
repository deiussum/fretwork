## 1. Pure building blocks

- [x] 1.1 Implement `engine/metronome/ramp.ts`: `tempoForBar`, `barsUntilNextStep`, `shiftRamp` (clamped to 30–300), and trainer validation (start/target 30–300, target > start, step 1–50, every 1–64, with a message per field). Verify with unit tests for the spec scenarios: 95/5/4/120 ramp, 100/15/1/120 overshoot clamp, shift down mid-ramp, shift limited at 300, and each invalid field.
- [x] 1.2 Implement `engine/metronome/tapTempo.ts` (`tap(timeSec) → bpm | undefined`; up to 4 intervals, reset after >2 s, round, clamp 30–300). Verify with unit tests: five taps 0.667 s apart give 90, a pause resets (gives 60), a single tap gives undefined, and very fast or slow taps clamp.
- [x] 1.3 Add `domain/metronomeSettings.ts` (`MetronomeSettings`, defaults 100 BPM / 4 beats / trainer off / 80, 5, 4, 120, and a localStorage repository under `fretwork.metronome.v1` with field-by-field sanitising and an `available` flag). Verify with unit tests for defaults, round-trip, invalid fields falling back, and throwing storage.

## 2. Metronome engine

- [x] 2.1 Add the `Ticker` interface with an interval implementation, plus `tick` and `accent` `SoundKind`s in `sounds.ts`. Verify that existing tests still pass and that `RecordingSounds` records the new kinds.
- [x] 2.2 Implement `MetronomeEngine` (`start`/`stop`/`subscribe`/`getState`, lookahead scheduler, accent on beat 1 only when beats per bar > 1, `beatAt(now)`, generation guard around `resume()`). Verify with `FakeClock` + `RecordingSounds` + fake timers: click times at 120 BPM are exact, the 3/4 accent pattern is correct, the first beat comes within 200 ms of start and is accented, and stop cancels and schedules nothing further.
- [x] 2.3 Add live changes: tempo applies from the next unscheduled beat with no gap or double click, beats per bar applies from the next bar, and with the trainer on, tempo changes and tap shift the ramp while the bar count continues. Verify with engine tests for each spec scenario: speed up while playing, 4→3 change on beat 2, Shift+Down mid-ramp.
- [x] 2.4 Add the speed trainer to the scheduler (the tempo of each bar comes from `tempoForBar`, start refuses invalid trainer settings, stop resets the bar count). Verify with engine tests: the 95→120 ramp's beat times across bars 0–21 match the spec, restart begins at the start tempo, and invalid settings don't start.
- [x] 2.5 Add visibility-aware lookahead (1.5 s while hidden, 100 ms when visible) through an injected visibility source. Verify with an engine test that hiding schedules about 1.5 s ahead, and that becoming visible again doesn't double-schedule.
- [x] 2.6 Implement the Web Worker ticker (`tickerWorker.ts` + `WorkerTicker`) with a fallback to the interval ticker and a console warning if the worker can't be constructed. Verify that `npm run build` emits the worker chunk, and that `npm run dev` in Chrome logs worker ticks.

## 3. UI

- [x] 3.1 Generalise `useClockValue` to take any `{ now(): number }`. Verify that existing UI tests pass unchanged.
- [x] 3.2 Split `App.tsx` into a shell with a tool switcher ("1 minute changes" | "Metronome") and a `ChangesTool` holding today's body. The switcher is hidden unless the session is idle, and 1 minute changes is shown on load. Verify that `App.test.tsx` and `App.mic.test.tsx` pass, and with a jsdom test that the switcher is hidden during count-in and that choosing Metronome shows it.
- [x] 3.3 Build `MetronomeTool`: large tempo and beat markers (accent distinct, readable at about 2 m), beats-per-bar control, trainer toggle and four number fields (editable only while stopped, with validation messages), progress line ("next step in N bars" or target reached), and a step-up flash. The tool stops the engine on unmount. Verify with jsdom tests: fields are disabled while playing, an invalid target shows its message, and switching tools while playing calls stop.
- [x] 3.4 Add `useMetronomeKeys`: Space start/stop, Escape stop, ↑/↓ ±1 and Shift ±5, ←/→ beats per bar, T tap (using `event.timeStamp`), and S toggling the trainer only while stopped. Text and number fields keep their keys, except that Enter blurs and Escape stops. Verify with jsdom tests for each shortcut, for Space or arrows in a focused field being ignored, for S being ignored while playing, and for Space on the metronome not starting a changes session (and the reverse).
- [x] 3.5 Wire `main.tsx`: a second `WebAudioSounds` on the shared context, the metronome settings repository, `WorkerTicker` and a `document.visibilityState` source. Settings are loaded on start and saved on every change. Verify that the app runs in `npm run dev`, and that after setting 72 BPM in 3/4 and reloading, those values are shown.

## 4. End-to-end checks

- [x] 4.1 In Chrome, instrument `OscillatorNode.prototype.start` and check the logged times:
  - 120 BPM gives a 0.5 s spacing within 5 ms
  - the 3/4 accent pattern is correct
  - a tempo change mid-play has no gap
  - the 95→120 trainer steps on bar boundaries

  Verify by inspecting the logged times. Remove any test data from `localStorage` afterwards.
- [x] 4.2 **(User)** Play at 120 BPM, switch to another tab for 10 minutes, and listen for gaps. Also try a trainer run while the tab is hidden. Verify that there are no audible gaps or bunching. Record any issues as follow-up tasks.
- [x] 4.3 Verify that `npm test`, `npm run lint`, `npm run build` and `openspec validate add-metronome --strict` all pass.
