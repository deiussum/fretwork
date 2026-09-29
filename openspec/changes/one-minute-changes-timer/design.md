## Context

This is a new repository with no code yet. See proposal.md for motivation and specs/ for the behaviour contract. Two constraints shape the design:

1. **Audible timing must be steady.** Count-in clicks that drift or stutter are immediately noticeable to a musician. JavaScript timers (`setTimeout`/`setInterval`) and React render timing are not precise enough for this.
2. **Strum detection comes next.** The follow-up change will add microphone input, onset detection and a prefilled score. The session flow and the data model should not need to change to support it.

## Goals / Non-Goals

**Goals:**
- A framework-free session engine that owns all state transitions and timing and can be unit-tested without a browser DOM.
- A single time base (the audio clock) that later onset timestamps can share.
- A thin React layer that only renders state and forwards commands.

**Non-Goals:**
- Configurable run length, count-in length or tempo. These are fixed at 60 s and 4 × 1 s for now, but held as engine config values so they're easy to expose later.
- Custom or barre chord entry, chord diagrams.
- Charts or trends in the history view. A table is enough.
- Mobile layout, PWA or offline install.
- Any audio input.

## Decisions

### 1. Engine / UI split

```
src/
  engine/          # framework-free TypeScript
    session.ts     # state machine + scheduling
    clock.ts       # Clock interface; AudioContext-backed impl
    sounds.ts      # synthesised click / go / end sounds
  domain/
    chords.ts      # built-in chord list, pair key normalisation
    history.ts     # Result type, repository, PB/previous computation
  ui/              # React components + hooks
```

The engine exposes `getState()`, `subscribe(listener)` and commands (`start(pair)`, `abort()`, `submitScore(n)`, `discard()`). React reads it through `useSyncExternalStore`.

- *Alternative:* keep state in React (`useReducer` plus effects for timers). Rejected because timing logic would end up spread across effects, and it would be hard to test or extend with an audio detector.
- *Alternative:* XState. Rejected for now. The machine has 5 states and a hand-written discriminated union is enough. This can be revisited if more exercise types add complexity.

### 2. State machine

```
            start(pair)            t ≥ goTime            t ≥ endTime
  ┌───────┐ ─────────▶ ┌─────────┐ ─────────▶ ┌─────────┐ ─────────▶ ┌────────────┐
  │ idle  │            │countIn  │            │ running │            │ confirming │
  └───────┘ ◀───────── └─────────┘            └─────────┘            └─────┬──────┘
      ▲  ▲     abort()                abort()      │                       │
      │  └─────────────────────────────────────────┘          submitScore(n)│  discard()
      │                                                                     ▼     → idle
      │           start(samePair) / back()                           ┌────────────┐
      └────────────────────────────────────────────────────────────── │   result   │
                                                                      └────────────┘
```

State is a discriminated union. `countIn` and `running` carry absolute audio-clock times (`goTime` and `endTime`) instead of counters, so the UI derives what to display from `clock.now()`. `confirming` carries an optional `suggestedScore`, which stays `undefined` for now. This is the hook the strum detector will fill in.

### 3. The audio clock is the single time base

A `Clock` interface (`now(): number` in seconds) is backed by `AudioContext.currentTime`. On `start()` the engine:
1. calls `audioContext.resume()`, which runs inside the key handler's user gesture (see the audio unlock requirement);
2. sets `t0 = now() + 0.15` (a small lead time for scheduling);
3. schedules clicks at `t0 + 0, 1, 2, 3`, "go" at `t0 + 4` and the end sound at `t0 + 64`, all on the audio timeline;
4. stores `goTime = t0 + 4` and `endTime = t0 + 64`.

Sounds scheduled on the audio timeline are sample-accurate no matter what the main thread is doing. This is how the ≤ 5 ms spacing requirement is met.

State transitions (`countIn → running → confirming`) are detected by a lightweight poll (`setInterval` at ~50 ms) that compares `now()` with `goTime`/`endTime`. The UI uses `requestAnimationFrame` only for redrawing the countdown. The poll keeps running when the tab is in the background, where rAF pauses, so the end transition still happens.

On `abort()`, every scheduled source node is `stop()`ped and disconnected, and the poll is cleared.

- *Alternative:* `setTimeout` chains for clicks. Rejected because of drift and the ~4 ms+ jitter under load, and because they're throttled in background tabs.

### 4. Synthesised sounds, no audio assets

The sounds are generated with an `OscillatorNode` plus a short `GainNode` envelope:
- click: 1 kHz, ~30 ms
- go: 1.5 kHz, ~80 ms, louder
- end: a two-tone 880 → 660 Hz, ~400 ms

There are no files to load and no decode latency, and the tones are easy to adjust. Keeping the sounds short and percussive also helps the future detector, which has to ignore the app's own sounds.

### 5. Testability

The engine takes its `Clock` and a `SoundScheduler` as constructor dependencies. Tests use a fake clock that is advanced manually, plus a recording scheduler. This lets them check the exact schedule times, the transitions, and that aborting cancels everything. Vitest fake timers drive the poll.

### 6. Pair identity

`pairKey(a, b)` sorts the two chord names and joins them with `|`, e.g. `A|D`. Display uses the order the player picked. History and personal bests always use the key.

### 7. Persistence

A `HistoryRepository` interface has a `localStorage` implementation. Everything is stored under a single key, `guitar.oneMinuteChanges.v1`, as `{ version: 1, results: Result[], lastPair?: [string, string] }`.

```ts
type Result = {
  id: string;             // crypto.randomUUID()
  pairKey: string;        // "A|D"
  chords: [string, string];
  score: number;          // confirmed
  durationSec: number;    // 60
  at: string;             // ISO timestamp
  method: 'manual' | 'mic';
  detectedScore?: number; // filled by strum-detection
};
```

Personal best, previous score and the per-pair summaries are computed from the results array. Even at thousands of entries that's cheap, so no indexes or derived data are stored. Any read or write failure puts the repository into a "degraded" mode: sessions keep working, and the UI shows a notice.

- *Alternative:* IndexedDB. Rejected for now because it adds async complexity for tiny data. Because the repository interface is async-ready (it returns Promises), switching later won't change callers.

### 8. Keyboard handling

A single `keydown` listener on `window`, owned by one hook, maps keys to engine commands based on the current state. Space's default action (page scroll, button activation) is prevented. Chord selects use native `<select>` elements, so keyboard focus behaviour stays accessible. In the confirming state, the score input is auto-focused.

### 9. Project setup

Vite `react-ts` template, strict TypeScript, Vitest + jsdom for UI tests (the engine tests need no DOM), and ESLint with the template defaults. Plain CSS modules. No UI kit, because the UI is a few large-type screens.

## Risks / Trade-offs

- **[Output latency]** The Bluetooth/OS output latency means clicks are heard slightly after their scheduled time. The spacing stays even, and even spacing is what matters for a count-in. → Accept for now. `outputLatency` becomes relevant to strum detection, not here.
- **[`AudioContext` suspended]** Some browsers suspend the context after a period of inactivity. → Call `resume()` on every start, not only the first.
- **[localStorage cleared]** If the user clears site data, history is lost. → Accept for now. JSON export/import is a cheap follow-up if it matters.
- **[Engine poll granularity]** Screen transitions can lag the audio end sound by up to ~50 ms. → Not noticeable. The recorded duration is the nominal 60 s either way.
