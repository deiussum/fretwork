## 1. Footer, privacy page and version

- [x] 1.1 Add `src/ui/PrivacyView.tsx`: the statement covering every point in the spec, plus the `PRIVACY_UPDATED`, `LOG_RETENTION` and project URL constants, a Back button and an Escape handler. `LOG_RETENTION` starts as a clearly marked placeholder. Verify with a jsdom test that the page shows the last-updated date, the GitHub link (opening in a new tab with `noopener`) and the access-log retention text, and that Escape and Back call `onClose`.
- [x] 1.2 Update the `App.tsx` shell:
  - add the privacy view state, which remembers the previous tool
  - add a footer with a Privacy link, shown under the same condition as the tool switcher
  - hide the switcher while the privacy page is shown

  Verify with jsdom tests:
  - the footer shows on setup and on the metronome, and is hidden during a count-in
  - opening Privacy from the metronome stops it
  - Escape returns to 1 minute changes with a typed pair kept
  - Space on the privacy page starts nothing
- [x] 1.3 Style the footer and privacy page (readable, consistent with the existing theme, light and dark). Verify by viewing both in the browser in light and dark mode.
- [x] 1.4 Add `src/buildVersion.ts` (`formatBuildVersion`), the `__APP_VERSION__` define in `vite.config.ts` with its type declaration, and the version in the footer. Verify with:
  - a unit test of `formatBuildVersion`: a release with a hash, a release without one, and dev
  - a jsdom test that the footer shows `dev`
  - a check that the `npm run build` output contains `v0.1.0 · <short hash of HEAD>`
- [x] 1.5 Set the `package.json` version to `0.1.0`. Verify with the build check in 1.4.

## 2. Content-Security-Policy

- [x] 2.1 Add a build-only Vite plugin to `vite.config.ts`, using a pure `buildCsp()`, that adds the CSP meta tag from design.md to `index.html`. Verify with a unit test of `buildCsp()` (every directive present, no `unsafe-inline` or `unsafe-eval`), and check that `npm run build` puts the tag in `dist/index.html` while the dev server's HTML has no tag.
- [x] 2.2 Check the production build in Chrome with `vite preview`:
  - the app loads with no CSP violations in the console
  - the metronome plays, and its worker ticks
  - Mic mode opens an input and loads the worklet
  - a recording download works
  - a `fetch` to another site from the console is blocked

  Remove any test data from `localStorage` afterwards. If anything is blocked, adjust the policy and update design.md.

## 3. Documentation

- [x] 3.1 Add a Privacy section to the README summarising the statement and pointing to the in-app page. Add the "update the privacy page and CSP" rule to AGENTS.md and CONTRIBUTING.md. Add a short Releases section to CONTRIBUTING.md: bump the version in `package.json` and tag the commit `v0.x.y` for each deploy. Verify by reading the rendered Markdown and checking the links resolve.

## 4. Before sharing

- [x] 4.1 **(User)** Confirm how long the self-hosted servers keep access logs and set `LOG_RETENTION`. Set `PRIVACY_UPDATED` to the release date. Verify that the privacy page shows the real period and no placeholder text.
- [x] 4.2 Verify that `npm test`, `npm run lint`, `npm run build` and `openspec validate add-privacy-statement --strict` all pass.

Note: tag the release commit `v0.1.0` when it is deployed, as described in the Releases section of CONTRIBUTING.md.
