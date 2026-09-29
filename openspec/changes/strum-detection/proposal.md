## Why

Counting changes in your head while playing is distracting and error-prone, and it's the main friction left in the 1 minute changes drill. Detecting strums from the player's audio input lets them just play: the count goes up on its own, and the result is prefilled for confirmation. It should work with a clean instrument signal (DI or pickup through an audio interface) and with an ordinary microphone, so the app is useful to other players with other setups.

## What Changes

- New **Mic** counting mode alongside the existing Manual mode. The app starts in Manual on first launch. The chosen mode and input settings are remembered.
- Audio input setup: device picker, channel picker (Auto / 1 / 2) for multi-input interfaces, live level meter, strum indicator and sensitivity control. Microphone permission is requested only when Mic mode is chosen, and input is never played back through the speakers.
- Strum (onset) detection that runs on the audio thread and timestamps strums on the same audio clock the session already uses. It ignores the app's own "go" and end sounds.
- A live strum count on the run screen in Mic mode. The confirm screen is prefilled with the detected count, and the player can still edit it.
- Counting rule made explicit in both modes: **score = number of strums in the 60 s**.
- Results from Mic mode record `method: 'mic'`, the detected count, and each strum's time since "go".
- Session recording for tuning and testing: a developer setting records the run's input and exports a WAV plus an Audacity label file of detected strums. Hand-corrected label files become test fixtures, and the detector is measured against them for precision and recall.

## Capabilities

### New Capabilities
- `audio-input`: choosing and opening an audio input (device, channel, permission, raw capture without voice processing), level metering, sensitivity, and remembering these settings.
- `strum-detection`: detecting strums in the input with audio-clock timestamps, the refractory window, ignoring self-generated sounds, the counting rule, and the accuracy targets measured against labelled recordings.
- `session-recording`: recording a run's input and exporting it as a WAV with Audacity-format strum labels.

### Modified Capabilities
- `change-session`: adds Manual/Mic counting mode, a live count during the run in Mic mode, a prefilled score in Mic mode, and the counting-rule hint on the confirm screen.
- `practice-history`: results may now have `method: 'mic'` with a detected count and strum timestamps.

## Impact

- `src/engine`: new onset detector (pure TS), an AudioWorklet wrapper, an `OnsetSource` interface injected into `SessionEngine`, and a live count in the engine state.
- `src/domain`: `Result` gains an optional `onsets` field. Stored data stays readable (`version: 1`; the new fields are optional).
- `src/ui`: input settings panel, level meter, live count display, and a recording toggle and export.
- Browser APIs: `getUserMedia`, `enumerateDevices`, `AudioWorklet`.
- Test fixtures: a few short WAV recordings plus label files, committed to the repo (a few MB).
