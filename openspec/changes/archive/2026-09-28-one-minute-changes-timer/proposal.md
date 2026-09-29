## Why

"1 minute changes" is one of the most effective drills for building chord-change speed. Doing it with a phone stopwatch and a notebook is awkward, though: your hands are on the guitar, starting and stopping is fiddly, and scores are rarely reviewed. A dedicated tool with an audible count-in, a hands-off timer, and per-pair score history makes the drill easier to do consistently. It also lays the foundation for the long-term goal of counting changes automatically through strum detection.

## What Changes

- New React + TypeScript (Vite) web app scaffold. This is the first code in the repository.
- Chord pair selection: choose two chords (from a built-in list of common open chords) to practise changing between.
- A keyboard-driven practice session: an audible count-in, a 60-second run with a large countdown readable from playing distance, and a distinct end sound.
- A score confirmation step after each run, where the player enters the number of changes. Later, the strum detector will prefill this same screen.
- Local history of results per chord pair, with the personal best and previous score shown right after each run.
- A framework-free session engine that owns the state machine and all timing, and uses the Web Audio clock. This lets strum detection plug in later without changing the flow.

Out of scope, planned as a follow-up change (`strum-detection`): audio input selection, level meter, onset detection, and prefilling the detected count.

## Capabilities

### New Capabilities
- `chord-pair-selection`: choosing the two chords for a session from a known chord list. Pairs are treated as unordered (A↔D equals D↔A).
- `change-session`: the practice session lifecycle: start, audible count-in, timed run with visual countdown, end signal, abort, and score confirmation, all driven by the keyboard.
- `practice-history`: persisting confirmed results locally, with personal best and previous score per chord pair, plus a simple history view.

### Modified Capabilities
<!-- None: no existing specs. -->

## Impact

- New codebase: Vite + React + TypeScript project, with Vitest for tests.
- Browser APIs: Web Audio (`AudioContext`) for scheduled sounds and as the timing clock; `localStorage` for persistence.
- No backend and no external services.
- Sets up the engine/UI boundary and the result data model (including a `method` field and an optional detected count) that `strum-detection` will build on.
