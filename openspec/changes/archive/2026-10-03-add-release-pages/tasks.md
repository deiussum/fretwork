## 1. Release notes

- [x] 1.1 Add `scripts/releaseNotes.ts` with the pure `releaseNotes(...)` function: Conventional Commit parsing, Features / Fixes / Other changes groups (empty ones left out), `chore(release)` subjects dropped, `**scope:**` rendering, "(breaking)" for `!`, a privacy notice when the date changed, a first-release line when there are no subjects, and the image line. Verify with unit tests for each spec scenario (the 0.4.0 notes, privacy changed and unchanged, image to pull, first release) plus a non-conventional subject and a breaking change.
- [x] 1.2 Add `scripts/release-notes.ts <tag>` and the `release-notes` npm script. It finds the previous tag with `git describe`, takes subjects from `git log --no-merges`, reads `PRIVACY_UPDATED` at both tags, and gets the owner from `GITHUB_REPOSITORY_OWNER` or the `origin` remote. It fails clearly when the tag or the privacy date can't be found. Verify by running it for v0.2.0, v0.3.1 and v0.4.0 and checking the output against the spec: 0.4.0 has the privacy notice and #18 under Features, 0.3.1 has #13 under Fixes and no notice, and 0.2.0 says first release.

## 2. Publishing

- [x] 2.1 Add `scripts/publish-release.sh <tag>`: write the notes to a temp file, then `gh release edit` if the release exists, otherwise `gh release create --verify-tag --title "Fretwork <x.y.z>" --latest=<true only for the highest v* tag>`. Verify that `bash -n` passes and that it is executable.
- [x] 2.2 Update `.github/workflows/release.yml`: `contents: write`, then after the image push, `actions/setup-node` (22, npm cache), `npm ci` and `scripts/publish-release.sh "$GITHUB_REF_NAME"` with `GH_TOKEN`. Verify with `actionlint` (for example `nix run nixpkgs#actionlint`), and by reading that the step comes after `docker/build-push-action` in the same job.

## 3. Backfill and checks

- [x] 3.1 Run `scripts/publish-release.sh` locally for v0.2.0, v0.3.0, v0.3.1 and v0.4.0, in that order. Verify with `gh release list`: four releases, "Fretwork 0.4.0" marked Latest, and the 0.4.0 page shows the privacy notice and the image line. Then run it again for v0.4.0 and verify it updates the page instead of failing.
- [x] 3.2 Verify that `npm test`, `npm run lint`, `npm run build` and `openspec validate add-release-pages --strict` all pass.
