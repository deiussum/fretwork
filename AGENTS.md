# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

A browser-based guitar practice app. The first tool is **1 minute changes**: pick two chords, hear a count-in, alternate between them for 60 seconds, then log the number of changes. Results are tracked per chord pair. The planned next feature is automatic change counting via strum (onset) detection from a microphone or audio interface.

Stack: React + TypeScript (strict), Vite, Vitest (+ jsdom and Testing Library for UI tests), oxlint. No backend. Persistence is browser `localStorage`.

## Commands

```sh
npm install
npm run dev      # dev server
npm test         # unit + UI tests (vitest run)
npm run lint     # oxlint
npm run build    # tsc -b && vite build
```

Before considering work done, run `npm test`, `npm run lint` and `npm run build`.

## Layout

```
src/
  domain/   chords, pair identity, results/history types, localStorage repository
  engine/   framework-free session engine: state machine, audio clock, sound scheduling
  ui/       React screens and hooks
  test/     shared test doubles
  App.tsx   screen routing; main.tsx wires engine + audio + storage
openspec/   specs, change proposals and project config (see below)
```

## Architecture rules

- **Timing lives outside React.** All timing- and audio-critical logic belongs in `src/engine` as plain TypeScript. React components render engine state (via `useSyncExternalStore`) and forward commands. Nothing more.
- **The audio clock is the only clock.** Use `AudioContext.currentTime` (through the `Clock` interface). Schedule sounds ahead on the audio timeline. Never use `setTimeout` chains for audible timing. UI countdowns read the clock once per animation frame.
- **Inject dependencies.** The engine takes `Clock`, `SoundScheduler` and `HistoryRepository` so tests can use `FakeClock`, `RecordingSounds` and `MemoryHistory`.
- **Chord pairs are unordered.** Use `pairKey(a, b)` for identity (A↔D equals D↔A). Keep the picked order only for display.
- **Results carry their counting method** (`manual` or `mic`) and an optional `detectedScore`, so that automatic counting can be added without changing the data model.
- **Keyboard first.** The player's hands are on the guitar. Space starts, Escape aborts or goes back, Enter confirms. Session screens must be readable from about 2 m away.
- TypeScript config uses `erasableSyntaxOnly`: no `enum`, no namespaces, no constructor parameter properties.

## Testing

- Engine and domain tests run in the node environment. UI tests opt in with a `// @vitest-environment jsdom` comment at the top of the file.
- Engine tests advance both `FakeClock` and Vitest fake timers together (the engine polls on an interval).
- Put new shared test doubles in `src/test/`.

## Spec-driven workflow (OpenSpec)

Work is planned in `openspec/`. Behaviour contracts live in `openspec/specs/<capability>/spec.md`. In-flight work lives in `openspec/changes/<name>/` (proposal, design, specs deltas, tasks).

- Create a new change with `openspec new change "<name>"`. Never create change directories by hand.
- When implementing a change, follow its `tasks.md` and tick each `- [ ]` as it's completed.
- If implementation diverges from the specs or design, update the artifacts rather than silently narrowing scope.
- `openspec validate <change> --strict` must pass.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, e.g. `feat(engine): add onset detector`, `fix(ui): keep pair after abort`, `chore(openspec): archive <change>`. Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`. Scopes typically match the top-level areas above (`engine`, `domain`, `ui`, `openspec`).
