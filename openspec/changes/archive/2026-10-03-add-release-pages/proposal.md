## Why

Fretwork is meant to be self-hosted. Each release publishes a container image, but there is no release page: an operator pulling `latest` cannot see what changed without reading commits. Privacy is a promise the app makes, so a release that changes what is stored or sent should tell operators where they will look. 0.4.0 is an example: it starts saving strumming patterns in the browser.

## What Changes

- The release workflow publishes a GitHub Release page for each version tag, after the container image has been pushed. A tag whose image fails to build gets no release page.
- Release notes are generated from the commits since the previous version tag and grouped by Conventional Commit type: Features, Fixes and Other changes. Version-bump commits (`chore(release): …`) are left out.
- When the privacy statement changed since the previous release, the notes open with a privacy notice giving the statement's new date.
- The notes give the exact image to pull (`ghcr.io/<owner>/fretwork:<x.y.z>`).
- Running the workflow again for the same tag updates the release page instead of failing.
- Release pages are created after the fact for the existing tags v0.2.0, v0.3.0, v0.3.1 and v0.4.0.
- Not included: a changelog file in the repository, attaching build files to releases, and pre-release or draft handling.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `deployment`: adds a release page requirement covering when the page is published, what its notes contain (grouped changes, privacy notice, image to pull), and re-runs.

## Impact

- `.github/workflows/release.yml`: `contents: write` permission, and Node setup plus `npm ci` so the notes script can run. A step after the image push creates or updates the release.
- `scripts/`: a release notes generator. A pure function turns commits and privacy dates into Markdown and is unit-tested. A small command-line wrapper reads them from git for a given tag.
- `package.json`: a `release-notes` script entry.
- GitHub: release pages for the four existing tags, created once from the same script.
- No change to the app, its stored data, the CSP or the container image.
