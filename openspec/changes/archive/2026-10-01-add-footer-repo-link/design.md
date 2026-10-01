## Context

See proposal.md for the motivation. The footer in `App.tsx` holds a "Privacy" button (styled as a link) and the build version. `PrivacyView.tsx` exports `PROJECT_URL = 'https://github.com/deiussum/fretwork'` for its "Questions" section.

## Goals / Non-Goals

**Goals:** one project URL used by both links, and a footer that stays quiet.

**Non-Goals:** per-instance repository URLs, and icons.

## Decisions

### 1. Upstream URL, shared constant

`PROJECT_URL` moves to `src/project.ts`, imported by both `PrivacyView` and the footer, so they can't disagree. It points upstream rather than to anything operator-configured. Questions about the software belong upstream, as on the privacy page, and operators already have `operatorContact` for questions about their own instance.

**Alternative considered:** adding a `repositoryUrl` to `config.json`. That's more configuration for little benefit, since a fork that changes the code can change the constant.

### 2. A real link, text only

The footer link is `<a href={PROJECT_URL} target="_blank" rel="noopener noreferrer">GitHub</a>`, a real link rather than a button. It goes between "Privacy" and the version, uses the footer's muted link style, and has no icon, which avoids an icon asset or font. It is user-initiated navigation, so the CSP's `connect-src` and the privacy statement don't apply.

## Risks / Trade-offs

- **[Trade-off]** A fork's footer still points upstream until the fork changes `PROJECT_URL`. → Acceptable, and documented by the constant's comment.
