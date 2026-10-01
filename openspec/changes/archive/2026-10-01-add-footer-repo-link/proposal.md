## Why

Fretwork is open source, but nothing in the app says so or points to the code, except a link deep in the privacy page. A link in the footer gives players a direct way to find the project: to report a problem, see what's changing, or run their own copy.

## What Changes

- Add a "GitHub" link to the footer, next to "Privacy" and the version. It points to the upstream project, `https://github.com/deiussum/fretwork`, and opens in a new tab.
- It's a plain link, so nothing loads from GitHub unless it's clicked. The privacy statement and Content-Security-Policy are unchanged.
- Not included:
  - a link to a fork's own repository (forks can change the URL)
  - an issue-reporting form

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `app-navigation`: the footer gains a link to the project's source code.

## Impact

- `src/App.tsx`: the footer gets the link. The project URL moves from `PrivacyView.tsx` to a shared constant, so the privacy page and footer use one value.
- `src/index.css`: the link matches the footer's muted style.
- Tests for the footer.
