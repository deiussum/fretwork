## Context

See proposal.md for the motivation and specs/privacy for the behaviour.

`App.tsx` is a shell that switches between `ChangesTool` and `MetronomeTool`:
- `ChangesTool` stays mounted and takes an `active` flag; when inactive it renders nothing and ignores keys.
- `MetronomeTool` is mounted only while shown, and stops the metronome when it unmounts.

The app makes no network requests of its own. Its only external resources are its own bundle, the strum-detection worklet module, the metronome ticker worker and the favicon. Downloads use `blob:` object URLs. The app will be self-hosted, so the host's access logs are under the author's control. `package.json` is at version `0.0.0` and has never been bumped.

## Goals / Non-Goals

**Goals:**
- One copy of the statement, shown in the app.
- A CSP that actually holds the app to "no other sites" in production, without affecting the dev server.

**Non-Goals:**
- Policies that can only be sent as HTTP headers, such as `frame-ancestors`. These depend on the self-hosting setup.
- Rendering Markdown. The statement is written directly as JSX.
- Release automation, changelogs, and marking builds made with uncommitted changes.

## Decisions

### 1. Privacy is a shell-level view, not a tool

The shell's state becomes `view: { kind: 'tool'; tool } | { kind: 'privacy'; from: Tool }`.

While the privacy page is shown:
- The page replaces the tool area, and the tool switcher is hidden.
- `ChangesTool` stays mounted with `active={false}`, so its pair, Practice/History view and key handler state survive.
- `MetronomeTool` unmounts and stops, as it does when switching tools.

Escape or Back returns to `from`. `PrivacyView` installs its own Escape handler while it's mounted. No other tool's key handler is active then, so Space does nothing.

**Alternative considered:** making Privacy a third entry in the tool switcher. That's wrong conceptually: privacy isn't a practice tool, and a footer link is the usual place to look for it.

### 2. Footer visibility follows the tool switcher

The footer holds the Privacy link and the build version (decision 6) in small muted text. It is rendered by the shell under the same `showSwitcher` condition: hidden during a 1 minute changes session, and shown on the privacy page itself, where it's harmless. That keeps the readable-from-2-m session screens uncluttered.

### 3. Statement text and facts live in one component

`src/ui/PrivacyView.tsx` holds:
- the statement as JSX
- a `PRIVACY_UPDATED` date constant
- a `LOG_RETENTION` constant
- the GitHub project URL

The README links to the in-app statement instead of copying it. The external link opens with `target="_blank" rel="noopener noreferrer"`. CSP doesn't restrict following links, so it isn't blocked.

### 4. CSP injected at build time by a small Vite plugin

`vite.config.ts` gets a plugin with `apply: 'build'`, whose `transformIndexHtml` adds this tag:

```
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self'; script-src 'self'; worker-src 'self'; connect-src 'self';
  img-src 'self'; style-src 'self'; media-src 'self'; font-src 'self';
  object-src 'none'; base-uri 'self'; form-action 'none'">
```

- **`connect-src 'self'` rather than `'none'`:** Vite's module-preload polyfill may `fetch` the app's own chunks. The guarantee is "no *other* sites", and `'self'` still blocks everything off-site.
- **Inline styles:** React writes styles through the DOM style API (CSSOM), which `style-src` doesn't block, so no `'unsafe-inline'` is needed. The browser check in the tasks confirms this.
- **Audio worklets:** `audioWorklet.addModule` is governed by `script-src`. The worklet is served from the app's own site, so `'self'` covers it.
- **Downloads:** `blob:` downloads are navigations, so the CSP doesn't apply to them. The browser check confirms they still work.

The plugin builds the policy string with a pure function, `buildCsp()`, which the unit test checks. Applying it only at build time keeps the dev server's live-reload websocket and inline scripts working.

**Alternatives considered:**
- An HTTP header: it's stronger and allows `frame-ancestors`, but it depends on the host. A meta tag goes wherever the build goes.
- A test that scans the source for `fetch` and similar calls: brittle, and it doesn't cover dependencies.

### 5. Keeping the promise

AGENTS.md and CONTRIBUTING.md get a rule: any change that adds network access, a new external resource or new stored data must update `PrivacyView` (including `PRIVACY_UPDATED`) and, if needed, the CSP. The `privacy` spec makes "only the app's own site" a contract that the archive and review steps will see.

### 6. Build version fixed at build time

`vite.config.ts` reads the version from `package.json` and the short commit hash from `git rev-parse --short HEAD`. If git isn't available or the source isn't a checkout, the hash is left out.

It passes the resulting text to the app through Vite's `define` as `__APP_VERSION__`, which is declared in a `.d.ts` file. A pure function `formatBuildVersion(command, version, hash)` in `src/buildVersion.ts` produces the text, and both the Vite config and the unit tests use it:
- `'serve'` → `dev`
- a build with a hash → `v0.1.0 · d933a13`
- a build without a hash → `v0.1.0`

Vitest runs in serve mode, so UI tests see `dev`. The value is a constant compiled into the bundle, so showing it needs no request and is unaffected by the CSP.

**Alternatives considered:**
- `import.meta.env` variables: they work, but `define` keeps the formatting in one tested function.
- Fetching a `version.json`: this adds a network request, against the privacy promise.

## Risks / Trade-offs

- **[Risk]** A future dependency or Vite version might use inline scripts or `eval`, which the CSP would block in production only. → The tasks include a browser check of the production build with `vite preview`. The CONTRIBUTING rule also asks contributors to check the console for CSP violations after touching build config.
- **[Risk]** The log retention stated in the app might not match the server. → The retention value is a named constant, filled in by a task for the author, and the build must not be shared until it is set.
- **[Trade-off]** A meta-tag CSP can't set `frame-ancestors` or reporting. This is accepted for now; header advice for self-hosting is a possible follow-up.
