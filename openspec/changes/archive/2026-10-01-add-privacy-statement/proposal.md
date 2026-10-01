## Why

Fretwork is about to be shared beyond its author, self-hosted at first. It asks for microphone access and keeps practice data in the browser, so people deserve a clear statement of what happens to their data. The honest answer is very little: there are no accounts, no server-side storage, and nothing leaves the browser except the normal requests to load the app.

Once other people use the app, bug reports also need to say which build they came from. So the new footer shows the build version as well as the Privacy link, and releases start at 0.1.0.

Making the privacy statement a stated promise is only worth it if it stays true. So this change also makes the production build enforce it, and adds a contributor rule to keep the statement current.

## What Changes

This change adds an app footer, with a privacy statement and the build version.

- Add an in-app **Privacy** page, reached from a new footer link that is shown wherever the tool switcher is shown. The page covers:
  - no accounts and no server-side storage
  - no requests to other sites
  - microphone use: Mic mode only, analysed locally, only strum times saved
  - session recordings: off by default, kept in memory only, downloaded straight to the player's computer
  - what is saved in the browser and how to delete it
  - the host's standard access logs and how long they are kept
  - a link to the GitHub project for questions
  - a "last updated" date
- Show the **build version** in the footer next to the Privacy link: `v<version> · <short commit>`, `dev` on the dev server, and no commit when built outside a git checkout.
- Set the `package.json` version to **0.1.0** for the first shared release.
- Add a **Content-Security-Policy** to the production build that blocks loading or connecting to any other site.
- Add a short **Privacy** section to the README that points to the in-app statement.
- Add a rule to AGENTS.md and CONTRIBUTING.md: any change that adds network access or new stored data must update the privacy page and the CSP.
- Add a release rule to CONTRIBUTING.md: bump the `package.json` version and tag the commit `v0.x.y` for each deploy.
- Not included:
  - an in-app "clear history" control
  - server header configuration for self-hosting
  - replacing the default favicon

## Capabilities

### New Capabilities
- `privacy`: the privacy statement page and how it is reached, and the guarantee that the app only talks to its own site, enforced in production by a Content-Security-Policy.

### Modified Capabilities
- `app-navigation`: adds a requirement for the build version shown in the footer.

## Impact

- `src/ui/`: a new `PrivacyView` and footer. The `App.tsx` shell shows the privacy view in place of the current tool. 1 minute changes keeps its state; the metronome stops, as it does when leaving it for any other screen.
- `vite.config.ts`: a build-only plugin that adds the CSP meta tag to `index.html`, and a `define` that inserts the build version text.
- `src/buildVersion.ts`: formats the version text. `package.json`: version set to 0.1.0.
- `README.md`, `AGENTS.md`, `CONTRIBUTING.md`: documentation updates.
- No new dependencies, and no change to stored data.
