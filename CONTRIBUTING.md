# Contributing to Fretwork

Thanks for helping out. This guide covers how work is planned, built and reviewed. [AGENTS.md](AGENTS.md) holds the detailed architecture and testing rules. It is written for AI coding agents, but the rules apply to everyone.

## Getting started

You need a current Node.js LTS and the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI (`npm install -g @fission-ai/openspec`).

```sh
npm install
npm run dev      # dev server
npm test         # unit and UI tests
npm run lint     # oxlint
npm run build    # type-check and production build
```

## How work is planned

Fretwork is spec-driven. Behaviour contracts live in `openspec/specs/<capability>/spec.md`. Each piece of work is an OpenSpec *change* in `openspec/changes/<name>/`. A change holds a proposal, a design, spec deltas and a task list.

1. **Explore** the idea if it is still fuzzy.
2. **Propose** a change: `openspec new change "<name>"`, then write the proposal, specs, design and tasks. Never create change directories by hand.
3. **Implement** it by working through `tasks.md` and ticking each task as it is done. If the implementation drifts from the specs or design, update those documents rather than quietly narrowing the scope.
4. **Archive** the change. This merges its spec deltas into `openspec/specs/` and moves the change to `openspec/changes/archive/`.

`openspec validate <change> --strict` must pass. In Claude Code, the `/opsx:explore`, `/opsx:propose`, `/opsx:apply` and `/opsx:archive` commands run these steps for you.

Small fixes that don't change behaviour, such as refactors, tooling or docs, don't need a change.

## Code guidelines

These are the main rules; see [AGENTS.md](AGENTS.md) for the rest.

- **Timing lives outside React.** Timing- and audio-critical logic belongs in `src/engine` as plain TypeScript. Components render engine state and forward commands.
- **The audio clock is the only clock.** Schedule sounds ahead on `AudioContext.currentTime`. Never chain `setTimeout` for anything audible.
- **Inject dependencies** (`Clock`, `SoundScheduler`, repositories and so on) so that engine code can be tested with fakes from `src/test/` and `FakeClock`.
- **Keyboard first.** The player's hands are on the guitar, so every tool must be usable from the keyboard and readable from about 2 m away.
- TypeScript is strict and uses `erasableSyntaxOnly`: no `enum`, namespaces or constructor parameter properties.

## Testing

- Engine and domain tests run in Node. UI tests opt in to jsdom with a `// @vitest-environment jsdom` comment.
- Engine tests advance `FakeClock` and Vitest's fake timers together.
- Unit tests can't hear audio. For timing changes, also check in a real browser: instrument `OscillatorNode.prototype.start` to log scheduled times, and remove any test data from `localStorage` afterwards.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, for example `feat(engine): add onset detector` or `fix(ui): keep pair after abort`. Common types are `feat`, `fix`, `refactor`, `test`, `docs` and `chore`. Scopes usually match the source areas: `engine`, `domain`, `ui`, `openspec`.

## Pull requests

`main` is protected, so all changes go through a pull request from a branch.

Before opening a PR:

- Run `npm test`, `npm run lint` and `npm run build`. All three must pass.
- **Archive the OpenSpec change** so the PR includes the archived change and the updated specs.

  The exception is a **draft PR** opened for early feedback before the change is ready for final review. Archive it before marking the PR ready.

In the PR description, say what changed and how you tested it, including any manual or in-browser checks. PRs are squash-merged, so the PR title becomes the commit message. Write it as a Conventional Commit too.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
