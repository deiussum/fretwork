## 1. Spike and shared audio context

- [x] 1.1 Spike: load a trivial TypeScript AudioWorklet that imports another module via Vite `?worker&url`, in `npm run dev` and in `npm run build` + `vite preview`. Verify that it logs from the audio thread in both. If it fails, switch to the fallback in design.md (a separate build entry) and note that in design.md.
- [x] 1.2 Add `engine/audioContext.ts` (a shared, lazily created and resumed AudioContext) and make `WebAudioSounds` use it. Verify that the existing tests pass and that a manual run in the browser still schedules sounds at 0/1/2/3/4/64 s (instrument `OscillatorNode.prototype.start`).

## 2. Pure DSP building blocks

- [x] 2.1 Implement `onset/fft.ts` (radix-2 real FFT, magnitudes). Verify with unit tests on known sine inputs (the peak bin is correct and the magnitude matches within 1%).
- [x] 2.2 Implement `recording/wav.ts` (encode and decode mono 16-bit PCM at any sample rate). Verify with a round-trip test (error ≤ 1 LSB) and a header field check.
- [x] 2.3 Implement `recording/labels.ts` (read and write Audacity point labels). Verify with round-trip tests and by parsing a label file exported from Audacity (tabs, `.`-decimal seconds).
- [x] 2.4 Add a synthetic strum generator for tests (`src/test/synthStrums.ts`: Karplus-Strong chord strums at given times, optional noise, ring-over, sine beeps). Verify with a test that the output length and peak positions match the requested times.

## 3. Detector

- [x] 3.1 Implement `onset/detector.ts`: framing, Hann window, log-magnitude spectral flux over 80 Hz–8 kHz, median adaptive threshold with a sensitivity margin and an absolute floor, peak picking, 250 ms refractory period, config in seconds. Verify with synthetic tests: the count is exact for 40 strums at 1.2 s spacing, the timestamp error is ≤ 20 ms, silence and low noise give 0 onsets, and two strums 150 ms apart are counted once.
- [x] 3.2 Add synthetic tests for ringing chords: strums over a sustained previous chord at −6 dB. Verify that recall is ≥ 95% at the default sensitivity. Also verify that raising sensitivity increases detections on quiet strums (sensitivity spec).
- [x] 3.3 Implement `onset/strumWorklet.ts`: buffer 128-sample blocks into hops, channel selection (fixed or Auto with 1 s RMS and 6 dB hysteresis), level messages about every 33 ms, onset messages with `currentTime`-based times, recording chunk messages when enabled, and sensitivity/channel updates via the port. Keep the logic in testable helpers. Verify with unit tests of the channel-selection helper (the louder channel wins, no flip-flop within 6 dB).

## 4. Input controller and settings

- [x] 4.1 Add `domain/settings.ts`: `InputSettings` plus a localStorage repository under `fretwork.settings.v1` with defaults (manual, auto, default sensitivity, recording off) and degraded mode like history. Verify with unit tests for defaults, round-trip, and throwing storage.
- [x] 4.2 Add `input/onsetSource.ts` (the `OnsetSource` interface and `FakeOnsetSource`). Verify with a unit test that the fake delivers onsets and status changes to subscribers.
- [x] 4.3 Implement `input/audioInput.ts` (InputController): select Mic → `getUserMedia` with voice processing off and `channelCount` ideal 2 → enumerate devices → worklet node with no outputs. Select Manual → stop tracks and disconnect. Also handle the denied and unavailable states, device and channel switching, remembered-device fallback with a notice, `lost` on track end or device change, and settings persistence. Verify with unit tests using stubbed `mediaDevices` and a fake worklet port: no `getUserMedia` call in Manual mode, denied stays Manual, a missing remembered device falls back, and a track end sets `lost`.

- [x] 4.4 Rename the history storage key from `guitar.oneMinuteChanges.v1` to `fretwork.oneMinuteChanges.v1` (no migration). Verify that the `localStorageHistory` tests pass with the new key and that a browser reload after saving a result shows it in history.

## 5. Engine: Mic mode sessions

- [x] 5.1 Extend `SessionEngine.start(pair, { onsets })`: subscribe during the run, count onsets in `[goTime + 0.15, endTime)`, expose `count` in the `running` state, and in Mic mode move to `confirming` at `endTime + 0.2`. Verify with FakeClock/FakeOnsetSource tests covering count-in strums ignored, a strum at go + 0.1 ignored, a strum at go + 0.2 counted, a strum at end − 0.05 delivered during the grace period counted, and a strum at end + 0.05 ignored.
- [x] 5.2 Put `suggestedScore = count` and the onsets (seconds after go, 1 ms precision) on `confirming`. On source `lost`, set `inputLost` with no suggestion. Verify with tests for both paths.
- [x] 5.3 Save Mic results with `method: 'mic'`, `detectedScore` and `onsets`, even when the score is edited, and add `onsets?` to `Result`. Verify with tests: detected 36 and confirmed 34 are stored as specified, and manual results are unchanged. Also verify that a v1 history saved before this change still loads.
- [x] 5.4 Unsubscribe from the source on abort, on confirm and on dispose. Verify with a test that onsets after abort don't change state.

## 6. Recording and CLI

- [x] 6.1 Implement session recording: when `recordSessions` is on, capture the selected channel from `firstBeatTime` to `endTime` from worklet chunks, trim to the exact range, discard it on the next start or on abort, and produce the WAV plus labels (raw detections in the span, relative to the WAV start). Verify with a unit test of the trimming and label-offset logic using synthetic chunks.
- [x] 6.2 Add `scripts/detect.ts` and an `npm run detect` script (with `tsx`), which read a WAV and print Audacity labels to stdout, with a `--sensitivity` flag. Verify by running it on a synthetic WAV written by a test helper and checking the label count.

## 7. UI

- [x] 7.1 Add a counting-mode toggle (Manual / Mic) on the setup screen, wired to InputController. Show a message for denied or unavailable. Verify with a jsdom test that selecting Mic calls the controller, and that the denied state shows the message and stays on Manual.
- [ ] 7.2 Add an input panel in Mic mode: device select, channel select (hidden for mono), level meter, strum indicator flash, sensitivity slider, notice for a missing saved device, and an Advanced section with a "Record sessions" toggle. Verify manually in Chrome with the VOLT 2 (both inputs), and with a jsdom test that the channel select is hidden for 1-channel inputs.
- [ ] 7.3 Pass the onset source to `engine.start` in Mic mode. Show the live count on the run screen in Mic mode only, readable at about 2 m. Verify with a jsdom test (count shown in Mic mode, absent in Manual) and manually by strumming.
- [x] 7.4 On the confirm screen: prefill the detected count with the text selected, show the counting-rule hint in both modes, and show the input-lost message. Verify with jsdom tests for the prefill and selection, the hint in both modes, and input lost.
- [ ] 7.5 Add WAV and label download buttons on the confirm and result screens when a recording exists, with the file naming from the spec. Verify manually by exporting, opening in Audacity, and importing the labels. They should line up with the strums.

## 8. Fixtures and accuracy (needs the user's recordings)

- [ ] 8.1 **(User)** Record paired fixtures: the acoustic via pickup and via XLR mic at the same time in Audacity, at least 2 takes of about 20–30 s on different chord pairs. Label the pickup track using `npm run detect` plus hand correction, then export the WAVs and labels into `fixtures/strums/`. Verify that the files exist and the labels line up in Audacity.
- [x] 8.2 Add `fixtures/strums/manifest.json` and the accuracy test (±50 ms greedy matching, recall and precision per kind). Verify that the test runs in `npm test` and reports per-fixture recall and precision.
- [ ] 8.3 Tune the default sensitivity, margin range and absolute floor until all fixtures meet the spec thresholds (pickup ≥ 95%, mic ≥ 90%). Verify that the accuracy tests pass and synthetic tests still pass. Record the chosen defaults in design.md.

## 9. End-to-end check

- [ ] 9.1 **(User)** Full manual run with the VOLT 2 in Mic mode, on pickup and on the XLR mic: the live count tracks strums, the prefilled score is within ±1 of a careful manual count, count-in strums are ignored, the end result is saved with method `mic`, and after a reload the mode and input settings are remembered. Also confirm that the input is never heard through the speakers. Record any issues as follow-up tasks.
- [ ] 9.2 Verify that `npm test`, `npm run lint`, `npm run build` and `openspec validate strum-detection --strict` all pass.
