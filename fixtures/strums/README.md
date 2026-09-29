# Strum detection fixtures

Labelled recordings that the strum detector is measured against (`npm test` runs `accuracy.test.ts`).

## Adding a fixture

1. **Record.** In Audacity (or any DAW), record the acoustic through the pickup and the XLR mic at the same time, as two tracks. Play 20–30 s of 1 minute changes on one chord pair.
2. **Export.** Export each track as its own WAV file (mono is best; any bit depth).
3. **Detect.** Generate labels from the pickup track:
   ```sh
   npm run detect -- fixtures/strums/ad-take1-pickup.wav > fixtures/strums/ad-take1.labels.txt
   ```
   Recordings exported from the app itself (Mic mode → Advanced → Record sessions) also work. They start at the first count-in click, so trim the first 4.15 s off (the count-in plus the 0.15 s after "go" that the app ignores) to match what the app counts.
4. **Correct.** In Audacity, import the labels (File → Import → Labels…) next to the audio. Move, delete or add labels until there's exactly one at the start of every real strum. Then export them back over the same file (File → Export → Export Labels…).
5. **Register.** Add both tracks to `manifest.json`, sharing the same labels:
   ```json
   [
     { "wav": "ad-take1-pickup.wav", "labels": "ad-take1.labels.txt", "kind": "pickup" },
     { "wav": "ad-take1-mic.wav", "labels": "ad-take1.labels.txt", "kind": "mic" }
   ]
   ```

Targets (from the strum-detection spec): a detection matches a label within ±50 ms. For `pickup` fixtures, recall and precision must each be ≥ 95%; for `mic` fixtures, ≥ 90%.

Keep clips short (about 20–30 s) so the repo stays small.
