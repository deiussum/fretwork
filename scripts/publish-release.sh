#!/usr/bin/env bash
# Create or update the GitHub Release page for a version tag:
#
#   scripts/publish-release.sh v0.4.0
#
# Used by the release workflow after the image is pushed, and by hand to
# backfill older tags. Needs `gh` signed in (GH_TOKEN in CI) and the npm
# dependencies installed. Only the highest v* tag is marked as the latest
# release, so republishing an old tag never takes that from a newer one.
set -euo pipefail

tag="${1:?usage: scripts/publish-release.sh v<x.y.z>}"
cd "$(dirname "$0")/.."

notes="$(mktemp)"
trap 'rm -f "$notes"' EXIT
npx tsx scripts/release-notes.ts "$tag" > "$notes"

highest="$(git tag -l 'v*' --sort=-v:refname | head -n 1)"
latest=false
[ "$tag" = "$highest" ] && latest=true

if gh release view "$tag" > /dev/null 2>&1; then
  gh release edit "$tag" --notes-file "$notes"
  echo "Updated the release page for $tag"
else
  gh release create "$tag" --verify-tag --title "Fretwork ${tag#v}" --notes-file "$notes" --latest="$latest"
  echo "Created the release page for $tag (latest: $latest)"
fi
