## Context

See proposal.md for the motivation and specs/ for the behaviour. Today `App.tsx` is the 1 minute changes tool, with a Practice/History tab bar. `useSessionKeys` installs a single global `keydown` handler.

`SessionEngine` schedules every sound for its fixed 60 s up front on a `SoundScheduler`. `WebAudioSounds.cancelAll()` cancels everything that instance has scheduled. `SharedAudioContext` is the single clock and is shared by sounds and audio input. `useClockValue` re-reads the clock every animation frame, but it is typed to `SessionEngine`.

The metronome is open-ended and its tempo can change while it plays. That rules out scheduling everything up front. It also has to survive the browser throttling timers in background tabs.

## Goals / Non-Goals

**Goals:**
- Keep metronome timing logic framework-free and testable with `FakeClock` + `RecordingSounds` + fake timers, like the session engine.
- Keep one audio clock: metronome clicks are scheduled on the shared `AudioContext` timeline.
- Make tempo, including the speed trainer ramp, a pure function, so the scheduler stays simple.

**Non-Goals:**
- Sample-accurate click generation inside an AudioWorklet.
- Compensating the visual beat for output latency. The highlight uses the raw audio clock, the same as the session countdown.
- Sharing a scheduler between the metronome and `SessionEngine`. The session keeps scheduling up front.

## Decisions

### 1. Lookahead scheduler driven by an injected `Ticker`

`MetronomeEngine` (in `src/engine/metronome/`) schedules clicks ahead of time. On every tick it runs:

```
while nextBeatTime < clock.now() + lookahead:
    schedule(beat is first in bar and beatsPerBar > 1 ? 'accent' : 'tick', nextBeatTime)
    record beat { time, bar, beatInBar, bpm }
    nextBeatTime += 60 / bpm(of the beat just scheduled)
    advance beatInBar / bar
```

The tick interval is 25 ms and the lookahead is 100 ms. A timer only decides *when to schedule*. Every audible time comes from the audio clock, so this follows the "audio clock is the only clock" rule.

The timer is an injected `Ticker` interface (`start(intervalMs, onTick)`, `stop()`), so tests can drive it with Vitest fake timers.

**Alternatives considered:**
- Scheduling everything up front: not possible, because the run is open-ended and the tempo can change.
- An AudioWorklet that generates clicks: sample-accurate, but much more machinery. Oscillators scheduled ~100 ms ahead are already accurate to well under 1 ms.

### 2. Web Worker ticker for background tabs

In production the `Ticker` is backed by a small dedicated Web Worker (`tickerWorker.ts`, loaded via `new Worker(new URL(...), { type: 'module' })`) that posts a message every 25 ms.

Main-thread timers in hidden tabs are throttled to ≥1 s, and after ~5 minutes to once per minute. Dedicated worker timers are not throttled this aggressively.

As a second line of defence, the engine raises the lookahead to 1.5 s while `document.visibilityState === 'hidden'` and drops it back to 100 ms when the tab is visible again. A hidden tab receives no key events, so tempo can't change while hidden. Pre-scheduling more clicks is therefore safe. Trainer steps are deterministic, so they are scheduled correctly too.

Tests use an interval-based ticker. The worker is verified manually.

**Alternatives considered:**
- Only a larger hidden lookahead: this still fails under intensive throttling (once per minute).
- An AudioWorklet clock: see decision 1.

### 3. Tempo is a function of the bar

The speed trainer lives in a pure module (`ramp.ts`):

- `tempoForBar(bar, trainer) = min(target, start + floor(bar / every) * step)`
- `barsUntilNextStep(bar, trainer)`
- `shiftRamp(trainer, delta)`: clamps `delta` so that start ≥ 30 and target ≤ 300

With the trainer off, the tempo is simply the current `bpm`.

The scheduler asks for the tempo of the bar when it schedules each beat. The interval *after* a beat uses that beat's tempo. So the last beat of bar 3 lasts 60/95 s, and bar 4's first beat starts the 100 BPM spacing. Tempo changes from the keyboard or tap update `bpm` or shift the ramp, and take effect at the next unscheduled beat.

The beats per bar is read when a bar's first beat is scheduled and then fixed for that bar. This gives "takes effect from the next bar".

**Live changes reschedule.** Any change while playing (tempo, ramp shift, beats per bar) runs these steps:
1. Find the first scheduled beat that hasn't sounded yet.
2. Cancel it and everything after it with `SoundScheduler.cancelFrom(time)`, a new method next to `cancelAll()`.
3. Rewind the scheduler to that beat and schedule again under the new settings.

That beat keeps its time, so there is no gap or double click. The new settings apply to its tempo and to the intervals after it. A bar already under way keeps its length.

Without this, a change made just after returning to the tab would wait behind up to 1.5 s of beats scheduled at the hidden-tab lookahead (decision 2). That would break the 150 ms requirement.

The alternative was to only ever schedule 100 ms ahead. Rescheduling is cheap and keeps the background-tab defence.

### 4. Engine state exposes scheduled beats, not "current beat"

The engine keeps a short list of recently scheduled beats (`time`, `bar`, `beatInBar`, `bpm`). It exposes `beatAt(now)`, which returns the latest beat with `time <= now`.

The UI reads this every animation frame through `useClockValue`. That gives:
- the highlighted marker
- the displayed tempo, which changes exactly when the faster click is heard rather than when it is scheduled
- "bars until next step"
- the step-up flash, triggered when the `bpm` of the current beat is greater than the previous one

`useClockValue` is generalised from `SessionEngine` to anything with `now()`.

### 5. Separate `WebAudioSounds` instance

`main.tsx` creates a second `WebAudioSounds` on the same `SharedAudioContext` for the metronome. That way `cancelAll()` on stop can't affect a session, and the other way round.

Two new `SoundKind`s, `tick` and `accent`, are added to the `SOUNDS` table:
- `tick`: short sine at ~1200 Hz
- `accent`: ~1800 Hz, louder

### 6. Start uses the same unlock and generation guard as sessions

`start()` awaits `sounds.resume()` from the key handler, which is the user gesture. It then sets the first beat at `now + 0.05` and starts the ticker.

A generation counter invalidates a start that is still resuming if `stop()` arrives first. This is the same pattern as `SessionEngine`.

### 7. Tap tempo uses event timestamps

`TapTempo` is a pure class: `tap(timeSec) → bpm | undefined`. It keeps up to 5 tap times, resets after a gap of more than 2 s, then averages the intervals, rounds and clamps.

The UI passes `event.timeStamp / 1000`. Taps measure the player's input, not audible timing. The audio clock may also still be suspended before the first start, when it reads 0. With the trainer on, the tapped tempo becomes a ramp shift (`delta = tapped − shown`).

### 8. App shell and keyboard scoping

`App.tsx` becomes a thin shell holding `tool: 'changes' | 'metronome'`. It renders the tool switcher and either:
- `ChangesTool`: today's App body, including its Practice/History tabs, or
- `MetronomeTool`

Each tool mounts its own key hook. Only the visible tool's hook is mounted, so shortcuts are scoped automatically without a routing layer for key events. The shell reads the session state through `useSession` to hide the switcher when the session isn't idle.

`MetronomeTool` calls `engine.stop()` on unmount. This covers "leaving the metronome stops it".

### 9. Settings repository

`domain/metronomeSettings.ts` stores `MetronomeSettings` (`bpm`, `beatsPerBar`, `trainerOn`, `trainer: { start, step, every, target }`) under `fretwork.metronome.v1`.

It follows the `LocalStorageSettings` pattern:
- field-by-field sanitising with fallback to defaults
- an `available` flag
- in-memory operation when storage throws

The engine holds the live values. The UI saves on every change; writes are rare and tiny. Trainer field validation is a pure function shared by the UI (messages) and the engine (refuses to start).

## Risks / Trade-offs

- **[Risk]** Some browsers may still throttle worker timers in the background, or the module worker may not load. → The 1.5 s hidden lookahead covers short throttling. Manual verification in Chrome for 10 minutes hidden is a task. If the worker fails to construct, fall back to the main-thread ticker and log a console warning.
- **[Risk]** On high-latency outputs, such as Bluetooth, the visual beat may lead the sound noticeably. → Accepted for v1 (non-goal). `AudioContext.outputLatency` can be subtracted later without changing the engine interface.
- **[Trade-off]** The 1.5 s hidden lookahead means that stopping right after the tab becomes visible again cancels more scheduled oscillators. `cancelAll()` already handles that, so there is no audible effect.
- **[Risk]** Arrow keys and Space conflict with focused number inputs for the trainer settings. → Reuse `isTextEntry`, which already treats number inputs as text entry. Handle Enter (blur) and Escape (stop) explicitly, as the spec says.
- **[Trade-off]** Restructuring `App.tsx` touches the existing UI tests. → Keep `App`'s props and behaviour for the changes tool unchanged so `App.test.tsx` and `App.mic.test.tsx` pass, and add metronome and switcher tests alongside them.
