## Context

See proposal.md for the motivation and the `deployment` spec delta for the behaviour.

`.github/workflows/release.yml` runs on `v*` tags. One `image` job runs these steps:
1. Check that the tag is on `main` and matches `package.json`.
2. Build the amd64/arm64 image and push it as `<x.y.z>`, `<x.y>` and `latest`.

It checks out with `fetch-depth: 0`, so all history and tags are available. It doesn't set up Node.

PRs are squash-merged into `develop` with Conventional Commit titles, so each change is one commit whose subject ends in `(#N)`. A release then merges `develop` into `main` with a merge commit and tags it. For example, `git log --no-merges v0.3.1..v0.4.0` gives exactly #15, #16, #18 and #19.

The privacy statement's date is `PRIVACY_UPDATED` in `src/ui/PrivacyView.tsx`. AGENTS.md requires bumping it whenever the statement changes.

## Goals / Non-Goals

**Goals:**
- One code path that makes the notes and publishes the page, used by both the workflow and the one-off backfill.
- Notes logic that is a pure, unit-tested function.
- No new third-party Actions or runtime dependencies.

**Non-Goals:**
- A `CHANGELOG.md` in the repository.
- Re-running image builds for old tags. The backfill only creates pages.

## Decisions

### 1. Notes come from commit subjects, not GitHub's generated notes

`scripts/releaseNotes.ts` exports a pure function:

```ts
releaseNotes({
  version: '0.4.0',
  image: 'ghcr.io/deiussum/fretwork',
  subjects: string[],            // git log --no-merges --format=%s <prev>..<tag>; undefined for the first release
  privacyUpdated: string,        // at this tag
  previousPrivacyUpdated?: string,
}): string                       // Markdown
```

Subjects are parsed as `type(scope)!: text`:
- `feat` goes to Features, `fix` to Fixes, and anything else, or no match, to Other changes.
- Each entry is rendered as `**scope:** text`, or just `text` when there's no scope.
- A `!` adds "(breaking)".
- `chore(release)` subjects are dropped.

**Alternatives considered:**
- *`gh release create --generate-notes` with `.github/release.yml` categories:* this groups only by PR label, and the repo doesn't use labels. It lists PRs merged since the last release, including the version-bump PR and the `develop`→`main` release PR, which can only be left out by label. It also can't add the privacy notice or the image line.
- *A third-party action (release-drafter, semantic-release):* this adds a dependency and its own configuration for something a short tested function covers.

### 2. A thin git wrapper and a publish script shared with the backfill

- `scripts/release-notes.ts <tag>` (run with `npx tsx`, as `npm run release-notes -- <tag>`) works out the inputs from git:
  - previous tag: `git describe --tags --abbrev=0 --match 'v[0-9]*' <tag>^`, or none for the first release
  - subjects: `git log --no-merges --format=%s <prev>..<tag>`
  - privacy dates: `PRIVACY_UPDATED` read with `git show <ref>:src/ui/PrivacyView.tsx`
  - image owner: `GITHUB_REPOSITORY_OWNER`, or parsed from the `origin` remote

  It prints the Markdown.
- `scripts/publish-release.sh <tag>` writes the notes to a temp file, then creates or updates the release:
  - If `gh release view <tag>` succeeds, it runs `gh release edit <tag> --notes-file …`. A re-run updates the page instead of failing.
  - Otherwise it runs `gh release create <tag> --verify-tag --title "Fretwork <x.y.z>" --notes-file … --latest=<bool>`.
  - `--latest` is true only when the tag is the highest `v*` tag by version sort (`git tag -l 'v*' --sort=-v:refname | head -1`). Re-publishing an old tag can't take "latest" from a newer release, and the backfill can run oldest-first safely.

The workflow and the backfill both call `publish-release.sh`, so the backfill is a real run of the code the workflow will use.

### 3. Workflow changes

In `release.yml`:
- permissions become `contents: write` (needed by `gh release`) plus the existing `packages: write`
- after `docker/build-push-action`: `actions/setup-node` (Node 22, npm cache, as in `ci.yml`), then `npm ci`, then `scripts/publish-release.sh "$GITHUB_REF_NAME"` with `GH_TOKEN: ${{ github.token }}`

The release step runs only if the image push succeeded, because it's a later step in the same job. A failed image therefore never gets a page.

### 4. Backfill from a maintainer's machine

Run `scripts/publish-release.sh` locally for v0.2.0, v0.3.0, v0.3.1 and then v0.4.0, using the maintainer's `gh` login. Their images already exist, so nothing is rebuilt.

**Alternative considered:** a `workflow_dispatch` trigger with a tag input. It would rebuild and push the image for each old tag, moving `latest` and `0.3` back to older images.

## Risks / Trade-offs

- **The workflow step only runs for real on the next tag** → The backfill runs the same script with the same `gh` commands. Lint the workflow with `actionlint` if it's available. The remaining untested parts are the `GH_TOKEN` and the permissions, and a failure there leaves the image published with no page. Re-running the job, or `publish-release.sh` locally, fixes it.
- **Commit subjects that don't follow Conventional Commits** → they still appear, under Other changes.
- **`git describe` picks the nearest earlier tag in the history** → this is right for the linear `main` release line. A hotfix tag on a side branch would be compared with its own ancestor, which is also what you'd want.
- **Privacy date lookup if the file moves** → the wrapper fails loudly when it can't find `PRIVACY_UPDATED` at the tag, rather than silently leaving the notice out.
