## Context

See proposal.md for motivation and specs/ for behaviour. The existing engine (`src/engine/session.ts`) already has the seams this change needs: `confirming.suggestedScore`, `suggestScore()`, and a `Result` with `method` and `detectedScore`. All session timing uses one `AudioContext` clock, owned by `WebAudioSounds`.

Constraints from the project rules: timing and audio logic stays in framework-free TypeScript, the audio clock is the only clock, and dependencies are injected so everything can be tested with fakes.

## Goals / Non-Goals

**Goals:**
- A pure, sample-rate-agnostic detector that runs identically in an AudioWorklet, in Node tests and in a CLI.
- Strum timestamps on the session's audio clock.
- Measurable accuracy through labelled fixtures, plus fast synthetic tests that need no fixtures.

**Non-Goals:**
- Checking that the chords actually alternate (chroma or chord recognition).
- Compensating for input latency. The offset is constant, so it doesn't affect counts or intervals.
- Recording two inputs at once in the app. For paired pickup and mic fixtures, record in a DAW and use the CLI (Decision 9).
- Charts of strum timing. The data is stored for later.

## Decisions

### 1. Module layout

```
src/engine/
  audioContext.ts        shared AudioContext owner (lazy create + resume)
  sounds.ts              WebAudioSounds now takes the shared context
  onset/
    detector.ts          pure: feed(samples) → onset times; config in seconds
    fft.ts               small radix-2 real FFT (no dependency)
    strumWorklet.ts      AudioWorkletProcessor shell: channel pick, level, detector, recording taps
  input/
    audioInput.ts        InputController: permission, devices, open/close, status, level, onsets
    onsetSource.ts       OnsetSource interface + FakeOnsetSource
  recording/
    wav.ts               encode/decode mono 16-bit PCM WAV (pure)
    labels.ts            Audacity label format read/write (pure)
src/domain/settings.ts   InputSettings + localStorage repository
scripts/detect.ts        CLI: WAV → Audacity labels
fixtures/strums/         labelled recordings + manifest.json
```

### 2. One AudioContext for sounds and input

Onset timestamps are only comparable with `goTime` and `endTime` if both come from the same context. `audioContext.ts` owns a single lazily created `AudioContext`, and `WebAudioSounds` and `InputController` both use it. It's created or resumed on the first user gesture, which is either Space/Start or selecting Mic mode.

- *Alternative:* a separate context for input. Rejected because the clocks would be unrelated and would need cross-correlating.

### 3. Detection runs in an AudioWorklet

The worklet receives 128-sample blocks on the audio thread and uses the global `currentTime`, which is the same clock as the session. It buffers into hops and runs the detector. It posts:
- `onset { time }` immediately
- `level { rms, peak, channel }` about every 33 ms
- `chunk { startTime, samples }` only while recording

A sample's time is `currentTime + i / sampleRate`. The worklet node has no outputs and is never connected to the destination, which satisfies "never play the input back." Vite bundles it via `import url from './strumWorklet.ts?worker&url'` so it can import `detector.ts`.

- *Alternative:* `AnalyserNode` polled from the main thread. Rejected because of coarse timing, frames dropped under load, and no sample-accurate timestamps.

### 4. Detector: spectral flux with an adaptive threshold

- **Frames:** 1024-sample window (Hann), hop of about 5 ms. Sizes are derived from the sample rate, since config is in seconds.
- **Feature:** log-compressed magnitude spectrum, 80 Hz–8 kHz, computed as `log(1 + γ·|X|)` with a large γ (1e5). A large γ makes the compression close to a pure log, so a strum's flux barely depends on how loudly it's played. With γ = 1e3, strums 6–12 dB quieter than their neighbours were missed on synthetic tests. The onset strength is the half-wave-rectified sum of bin increases from the previous frame (spectral flux).
- **Threshold:** a running median of the flux over the last ~0.5 s, plus a margin, plus a quiet-signal floor so silence never triggers. Sensitivity (0–1) controls both: the margin goes from 0.26 down to 0.08 and the floor from −56 dBFS down to −75 dBFS as sensitivity rises. The middle of the slider (0.5, the default) is a margin of 0.17 and a floor of about −65 dBFS. These were tuned on the recorded fixtures (see *Tuning on real recordings* below) so the default is the recommended setting.
- **Peak picking:** a local maximum above the threshold, with about 15 ms of look-ahead.
- **Refractory period:** 250 ms. Onsets within 250 ms of the last accepted one are dropped.
- **Broadband check:** a strum sets every string ringing at once, so most of the spectrum jumps. Finger noise while changing chords (fingers landing like a hammer-on, strings released, squeaks) changes only a narrow slice. A candidate counts only if at least 30% of the 80 Hz–8 kHz bins rose by 6 dB or more, comparing the spectrum 60 ms before the candidate with the spectrum 30 ms after it. The 30 ms matters: a thumb strum sweeps across the strings more slowly than a pick, so measuring sooner (15 ms) rejected real thumb strums.
- **High-band energy check:** over the same span, energy from 2 to 8 kHz must also rise by at least 4 dB. A strum always brings fresh high-frequency content, because ringing strings lose theirs quickly. Fretting a new chord while strings ring changes every string's pitch at once, so about half the bins rise and half fall, which gets past the broadband check. But no new energy arrives. Piezo pickups hear this very clearly. A check on total energy was tried first, but it rejected soft strums over a loud, still-ringing chord (about +1 dB total), and it placed detections 35–80 ms late (at the body of the strum rather than its start). Every count was exact anywhere from 3 to 6 dB, and 4 dB was chosen.
- **Timestamp:** the centre of the analysis window of the peak frame, on the audio clock. On synthetic strums this is within about 5 ms of the true onset.
- **Detection latency:** window plus the 30 ms decision delay is about 50 ms, within the 100 ms live-count budget.

Why this approach: spectral flux holds up when a ringing chord masks the energy rise of the next strum (the mic case), and it's cheap enough for the audio thread.

- *Alternatives:* a plain energy threshold (fails on ringing chords); ML models (too heavy for this).

### 5. Channel selection

The input is requested with `channelCount: { ideal: 2 }` and `echoCancellation`, `noiseSuppression` and `autoGainControl` all `false`. The worklet sees N channels.
- A fixed channel option uses that channel only.
- **Auto** tracks each channel's smoothed RMS over about 1 s and switches to another channel only if it's more than 6 dB louder. That hysteresis prevents flip-flopping.

Mono devices hide the channel option.

### 6. Engine integration

```ts
interface OnsetSource {
  readonly status: 'open' | 'lost'
  subscribe(listener: (e: { time: number }) => void): () => void
  onStatus(listener: (s: 'open' | 'lost') => void): () => void
}
start(pair, options?: { onsets?: OnsetSource })
```

- **Mode:** Manual mode passes no source, so behaviour is unchanged. Mic mode passes the `InputController`'s source. The engine itself never knows about devices.
- **Counting:** onsets are counted when `goTime + 0.15 ≤ t < endTime`. The 150 ms gate after "go" covers speaker bleed. Accepted times are stored.
- **Live count:** the `running` state gains `count`.
- **End of run:** in Mic mode the switch to `confirming` happens at `endTime + 0.2 s`. The end sound still plays exactly at `endTime`. The grace period lets a last strum just before the end, still being detected, get counted without changing the prefilled score under the player's fingers.
- **Confirming state:** carries `suggestedScore = count`, the onsets (seconds after go, rounded to 1 ms), and `inputLost` if the source reported `lost`. When the input was lost there is no suggestion.
- **Saving:** `submitScore` saves `method: 'mic'`, `detectedScore` and `onsets` whenever a source was used, even if the player edited the score.
- **Tests:** `FakeOnsetSource` emits times on demand, following the `FakeClock` pattern.

### 7. InputController

A framework-free store (`getState`/`subscribe`, like the engine) with the state `{ mode, status: 'off' | 'requesting' | 'open' | 'denied' | 'unavailable' | 'lost', devices, deviceId, channels, channelOption, sensitivity, level, lastOnsetAt }`.
- **Selecting Mic:** runs `getUserMedia`, then `enumerateDevices`, which only returns labels after permission is granted.
- **Selecting Manual:** stops all tracks, closes the worklet node, and sets status to `off`.
- **Device loss:** a track `ended` event or `devicechange` sets status to `lost`.

The UI reads `level` for the meter and `lastOnsetAt` for the strum-indicator flash. It re-renders from worklet messages, at most once per animation frame.

### 8. Settings persistence

`InputSettings = { mode, deviceId?, channelOption, sensitivity, recordSessions }` is stored under `fretwork.settings.v1`, separate from history. Defaults are `mode: 'manual'`, `channelOption: 'auto'`, default sensitivity tuned on fixtures, and `recordSessions: false`.

The results key is renamed from `guitar.oneMinuteChanges.v1` to `fretwork.oneMinuteChanges.v1`, to match the project name and the settings key. There is no migration: there is no existing data to keep, and data under the old key is simply ignored. `Result` gains `onsets?: number[]`. The data version stays 1 because all new fields are optional.

### 9. Recording, export and the CLI

- **Capture:** when `recordSessions` is on, the engine tells the input to record from `firstBeatTime` to `endTime`. The worklet sends Float32 chunks of the selected channel with their start times, and the main thread trims them to the exact range.
- **Export:** the confirm and result screens offer downloads through Blob URLs:
  - a mono 16-bit WAV (`wav.ts`)
  - an Audacity label file (`labels.ts`) with all raw detections in the recorded span, each as a point label timed relative to the WAV start
- **CLI:** `npm run detect -- <file.wav> [--sensitivity 0.6]` runs the same detector over any WAV and prints Audacity labels. It uses `tsx` because the source imports have no file extensions.
- **Paired fixtures:** the CLI is how you make them. Record the pickup and the XLR mic together in Audacity (or any DAW), export each track, run `detect` on the pickup track, fix the labels by hand, and use the same labels for both tracks.

### 10. Tests and fixtures

- **Synthetic tests** (fast, deterministic, no fixtures): generate plucked-string strums with a Karplus-Strong model at known times, add noise, reverb-like tails and a sine "go" tone, then assert on:
  - counts
  - timestamp error ≤ 20 ms
  - refractory merging
  - gating
  - silence producing no onsets

  These cover all the detector logic and the engine-level rules.
- **Fixture accuracy tests:** `fixtures/strums/manifest.json` lists `{ wav, labels, kind: 'pickup' | 'mic' }`. The test decodes each WAV, runs the detector at default sensitivity, matches detections to labels within ±50 ms (greedy nearest), and asserts the spec's recall and precision thresholds for that kind.
- **Fixture size:** clips are trimmed to about 20–30 s (roughly 2–3 MB each at 48 kHz mono 16-bit) and committed to plain git. No LFS unless the fixture set grows.

### Tuning on real recordings

Two 60 s recordings of an acoustic through the XLR mic (A↔D, one strummed with a pick, one with the thumb) were labelled by hand and added as fixtures. What they showed:

- Every false detection in the pick run fell 0.25–0.45 s *before* a strum: noise from the fretting hand while changing chords, not the pick. Those events were narrowband (6–65% of bins rising, versus 86–100% for real strums), which led to the broadband check.
- Thumb strums have a softer attack. At the original default, only 36% of them were found; they need a lower margin, which the broadband check makes safe.
- Results at the new defaults: pick 98% recall / 98% precision (57/57 counted), thumb 96% / 98% (52/53 counted). Across the slider, pick stays at 57 and thumb ranges from 47 (0.2) to 55 (1.0), peaking at 53/53 around 0.65.
- A paired recording (C↔G, 19 s, pickup and XLR mic at the same time, 44.1 kHz) showed a second kind of false trigger, specific to the pickup: 6 extra detections about 0.55 s after strums, when the new chord is fretted while strings still ring. They were broadband enough to pass (50–61% of bins) but carried no new high-frequency energy (−3 to +2 dB in 2–8 kHz, against +7 dB or more for strums), which led to the high-band energy check. With it, both tracks count 13, with no change to the A↔D results.

## Risks / Trade-offs

- **[Linux/PipeWire channel exposure varies]** An interface might appear as two mono devices or one 2-channel device. → Support both with device and channel pickers, and test on the user's VOLT 2 setup early.
- **[Vite worklet bundling]** `?worker&url` for AudioWorklet modules is less common than for Workers. → Do an early spike task to confirm it works in dev and in the build. Fallback: a separate Vite build entry for the worklet.
- **[Default sensitivity doesn't suit all setups]** → The sensitivity control plus the strum indicator lets players tune it. Defaults come from fixtures of both kinds.
- **[Input latency is not compensated]** Timestamps sit slightly after the true strum. → Constant offset, no effect on counts or intervals. Documented.
- **[Test data depends on the user]** Accuracy tests need real labelled recordings. → Synthetic tests carry development until the fixtures exist. The fixture tasks are explicitly assigned to the user.
- **[Timestamp precision not verified on real audio]** The fixture labels were corrected from detector drafts rather than placed independently, so they confirm counts but can't confirm the 20 ms timing requirement. At higher sensitivity, some pick strums are timestamped 30–40 ms earlier than at lower sensitivity (the first pick contact rather than the loudest point). → Counts and intervals are unaffected. Timing is verified on synthetic audio, and hand-placed labels can be added later if timing analysis needs it.
- **[Knocks count as strums]** A sharp tap on the guitar body or strings during a run passes every check, since it's loud, broadband and bright. Only its fast decay gives it away. Checking for sustain would mean waiting about 150 ms before counting, which breaks the 100 ms live-count requirement. → Accepted: knocks during a run are rare, and the player can correct the prefilled score. Knocks during the count-in aren't counted anyway.
- **[Pickup and mic hear strums at slightly different times]** The pickup senses the strings directly, while the mic's level can rise 20–50 ms later on some strums. → Paired fixtures keep one set of hand-judged strums but separate label files per track: the mic labels are the matching mic detections (within 60 ms). They check the mic's count against the hand labels, not its timing.
- **[Few fixtures]** Three short performances, one player and one guitar. → The fixtures catch regressions; more recordings (other guitars, electric DI, other rooms) can be added as they come.
- **[Memory while recording]** 64 s at 48 kHz as Float32 is about 12 MB. → Acceptable. Only one recording is kept, and it's discarded on the next start.
