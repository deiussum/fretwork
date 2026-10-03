## Why

Strumming rhythm is the other half of rhythm guitar, after chord changes. Most beginners learn it from a written pattern such as "D DU UDU" and a metronome that knows nothing about the pattern. Fretwork already has an accurate audio-clock metronome with a speed trainer, plus strum detection. A pattern player built on top of them gives guided practice now, and sets up automatic scoring of strums against the pattern later.

## What Changes

- Add a **Strumming** tool, a third tool next to 1 minute changes and the metronome. It is rhythm only: no chords are shown, and the player strums whatever chord they like.
- **Patterns** are a grid of slots per bar: 8ths, 16ths or triplets per beat, over one or more bars. Each slot is a hit, an accented hit, a chuck (muted percussive strum) or a miss (the hand moves but skips the strings).
  - In 8th and 16th patterns, strum direction follows the slot (down on even slots, up on odd), because the hand keeps moving. These patterns can be swung.
  - Triplet patterns set the direction on each slot, defaulting to down-up-down per beat.
- Play a pattern with a count-in bar and a large grid cursor that follows the audio clock. A **guide sound** plays each stroke: down and up at different pitches, accents louder, chucks as a short low tick, misses silent. After the count-in, a **sound choice** sets whether the player hears the click, the guide or both (default both), so the two don't have to compete.
- Reuse the metronome for tempo, the beat click, tap tempo and the **speed trainer**. The strumming tool has its own tempo and trainer settings, separate from the standalone metronome.
- A built-in **preset library** of common patterns (read-only), plus a **pattern editor** to create, duplicate, edit and delete custom patterns. Custom patterns are saved in the browser.
- Design the timing so that strum scoring can be added later without changing the pattern model or engine: every expected stroke's time comes from one pure function, and the engine keeps the timeline of expected strokes.
- Not included in this change: scoring strums from the microphone, practice history for patterns, chords or chord changes in a pattern, strum-direction detection, and importing or sharing patterns.

## Capabilities

### New Capabilities
- `strumming-patterns`: the strumming tool, covering the pattern model, presets, the editor, playback with count-in, the grid display, guide sounds, swing, tempo and speed trainer, keyboard control, background timing and remembered patterns and settings.

### Modified Capabilities
- `app-navigation`: the tool switcher gains "Strumming" and is hidden while the pattern editor is open. Keyboard shortcuts, leaving a tool, and the home link now cover the strumming tool as well as the metronome.
- `privacy`: the "Saved in the browser" part of the statement now includes custom strumming patterns. The footer is hidden while the pattern editor is open, and the CSP requirement names the strumming tool among the features that must keep working.

## Impact

- `src/domain/`: the strumming pattern model, the preset library and validation, plus localStorage repositories for custom patterns and strumming settings.
- `src/engine/`: a pure slot-timing module (swing, direction, expected strokes), a strumming engine composed with `MetronomeEngine`, and a small extension point in `MetronomeEngine` so another engine can schedule its own sounds on each beat. `SoundKind` gains guide sounds (down, up, accent variants, chuck).
- `src/ui/`: the Strumming tool screen, pattern list, editor, and keyboard hooks. The app shell gets a third tool.
- `src/ui/PrivacyView.tsx`: statement text and `PRIVACY_UPDATED`. No CSP change, since nothing is loaded from outside.
- No new runtime dependencies. Existing stored history, metronome settings and input settings are unchanged.
