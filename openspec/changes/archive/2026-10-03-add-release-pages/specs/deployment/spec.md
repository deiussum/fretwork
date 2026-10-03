## ADDED Requirements

### Requirement: Release page
Each release tag `v<x.y.z>` SHALL get a GitHub Release page titled "Fretwork <x.y.z>". It SHALL be published only after the container image for that tag has been published, so a tag whose image fails gets no release page. The newest version SHALL be marked as the latest release.

The release notes SHALL contain, in this order:
- **Privacy notice**, only when the privacy statement's last-updated date differs from the one in the previous release. It SHALL say the privacy statement changed, give its new date, and ask operators to review it before updating.
- **Changes** since the previous version tag, grouped under "Features" (`feat` commits), "Fixes" (`fix` commits) and "Other changes" (everything else, including commits that don't follow Conventional Commits). Each entry is the commit subject without its type prefix, keeping its scope and pull request number. Empty groups SHALL be left out. Version-bump commits (`chore(release): …`) and merge commits SHALL be left out. The first release, which has no previous tag, SHALL say it is the first release instead of listing changes.
- **Image**: the exact image to pull, `ghcr.io/<owner>/fretwork:<x.y.z>`.

Running the release again for the same tag SHALL update the existing release page instead of failing.

#### Scenario: Notes for 0.4.0
- **WHEN** `v0.4.0` is released after `v0.3.1`, with the commits "feat(strumming): add strumming pattern practice tool (#18)", "ci: develop branch flow; main holds the latest release (#16)", "test(deploy): wait for the access log line in the smoke test (#15)" and "chore(release): 0.4.0 (#19)" in between
- **THEN** the release page "Fretwork 0.4.0" lists "**strumming:** add strumming pattern practice tool (#18)" under Features, lists the ci and test commits under Other changes, has no Fixes group, and does not mention the 0.4.0 version bump

#### Scenario: Privacy statement changed
- **WHEN** the privacy statement was last updated 2026-10-01 at `v0.3.1` and 2026-10-03 at `v0.4.0`
- **THEN** the 0.4.0 notes begin with a privacy notice giving 2026-10-03 and asking operators to review the statement

#### Scenario: Privacy statement unchanged
- **WHEN** the privacy statement has the same date at `v0.3.0` and `v0.3.1`
- **THEN** the 0.3.1 notes have no privacy notice

#### Scenario: Image to pull
- **WHEN** the release page for `v0.4.0` is shown
- **THEN** it gives `ghcr.io/deiussum/fretwork:0.4.0` as the image to pull

#### Scenario: Image fails
- **WHEN** the container image for a tag fails to build or push
- **THEN** no release page is created for that tag

#### Scenario: Run again
- **WHEN** the release workflow runs a second time for a tag that already has a release page
- **THEN** the page's notes are replaced and the run succeeds

#### Scenario: First release
- **WHEN** release notes are made for `v0.2.0`, which has no earlier version tag
- **THEN** they say it is the first release and give its image
