## Why

Players practising with Fretwork currently need a separate app or device for a metronome. A metronome is the most common practice tool after a timer. A speed trainer that raises the tempo step by step is the standard way to build speed cleanly. Adding both as a second tool also gives the app the multi-tool structure it was always meant to have.

## What Changes

- Add a standalone **Metronome** tool, separate from 1 minute changes:
  - tempo from 30 to 300 BPM
  - start and stop
  - beats per bar, with an accented first beat
  - a large visual beat indicator readable from about 2 m
  - tap tempo
  - fully keyboard-driven
- Add a **speed trainer** to the metronome. It starts at a start tempo, raises the tempo by a step every N bars at a bar boundary, and holds at a target tempo. Changing the tempo during a run shifts the whole ramp.
- Remember the metronome and speed trainer settings between visits, in browser storage.
- Keep accurate time while the browser tab is in the background.
- Introduce an app shell with a tool switcher (1 minute changes | Metronome). Keyboard shortcuts apply only to the tool on screen. Leaving the metronome stops it.
- Not included in this change: subdivisions, repeating ramp cycles, volume and sound choice, practice logging for the metronome, and running the metronome during a 1 minute changes session.

## Capabilities

### New Capabilities
- `metronome`: the standalone metronome tool, covering tempo, time signature accent, start/stop, visual beat, tap tempo, speed trainer, keyboard control, background-tab timing and remembered settings.
- `app-navigation`: switching between practice tools, and limiting keyboard shortcuts and audio to the active tool.

### Modified Capabilities
<!-- None. The existing 1 minute changes behaviour is unchanged. app-navigation limits its keyboard handling to when that tool is active. -->

## Impact

- `src/engine/`: a new metronome engine (lookahead scheduler, pure tempo-ramp function), a `Ticker` abstraction with a Web Worker implementation, and new `SoundKind`s for the metronome tick and accent.
- `src/domain/`: metronome settings with a localStorage repository (`fretwork.metronome.v1`).
- `src/ui/`: a metronome screen and hooks, `useClockValue` generalised to any clock, and the existing session key handling limited to the active tool.
- `src/App.tsx` / `src/main.tsx`: the app shell gets a tool switcher. The current App body becomes the 1 minute changes tool. The metronome gets its own `WebAudioSounds` instance on the shared `AudioContext`.
- No new runtime dependencies. No changes to stored history or input settings.
