# Contributing to Fretwork

Thanks for helping out. This guide covers how work is planned, built and reviewed. [AGENTS.md](AGENTS.md) holds the detailed architecture and testing rules. It is written for AI coding agents, but the rules apply to everyone.

## Getting started

You need a current Node.js LTS and the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI (`npm install -g @fission-ai/openspec`). With Nix, `nix develop` provides both.

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
- **Privacy is a promise.** The in-app privacy page says the app talks only to its own site and keeps data only in the browser. If your change adds network access, an external resource or new stored data, update the privacy page (`src/ui/PrivacyView.tsx`, including its last-updated date) and, if needed, the Content-Security-Policy in `src/csp.ts`. After touching build config, check the production build (`npm run build && npx vite preview`) for CSP violations in the browser console.
- TypeScript is strict and uses `erasableSyntaxOnly`: no `enum`, namespaces or constructor parameter properties.

## Testing

- Engine and domain tests run in Node. UI tests opt in to jsdom with a `// @vitest-environment jsdom` comment.
- Engine tests advance `FakeClock` and Vitest's fake timers together.
- Unit tests can't hear audio. For timing changes, also check in a real browser: instrument `OscillatorNode.prototype.start` to log scheduled times, and remove any test data from `localStorage` afterwards.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, for example `feat(engine): add onset detector` or `fix(ui): keep pair after abort`. Common types are `feat`, `fix`, `refactor`, `test`, `docs` and `chore`. Scopes usually match the source areas: `engine`, `domain`, `ui`, `openspec`.

## Pull requests

Work happens on `develop`. `main` always holds the latest release.

- Branch from `develop`, and open your pull request **against `develop`**. GitHub suggests `main` by default, so change the base branch.
- Both branches are protected, so every change goes through a pull request.

Before opening a PR:

- Run `npm test`, `npm run lint` and `npm run build`. All three must pass.
- **Archive the OpenSpec change** so the PR includes the archived change and the updated specs.

  The exception is a **draft PR** opened for early feedback before the change is ready for final review. Archive it before marking the PR ready.

In the PR description, say what changed and how you tested it, including any manual or in-browser checks. PRs into `develop` are squash-merged, so the PR title becomes the commit message. Write it as a Conventional Commit too.

## Releases

The version in `package.json` is shown in the app's footer, together with the commit it was built from. For each release:

1. On `develop`, bump the version in `package.json` with a normal pull request. While it is 0.x, raise the minor version for new features and the patch version for fixes.
2. Open a pull request from `develop` into `main`, and merge it with a **merge commit** or as a fast-forward, **never a squash**. A squashed release commit isn't in `develop`'s history, so the branches would drift apart and later release PRs would show old changes again.
3. Tag the resulting commit on `main` as `v0.x.y` and push the tag.

Pushing the tag runs the release workflow. It checks that the tagged commit is on `main` and that the tag matches `package.json`, then publishes the container image to `ghcr.io/deiussum/fretwork` as `<version>`, `<major>.<minor>` and `latest`.

CI runs on every pull request and on pushes to `develop` and `main`: tests, lint and build, `nix flake check` (which builds the package and runs the NixOS module's VM test), and a smoke test of the container image (`deploy/smoke-test.sh`).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
