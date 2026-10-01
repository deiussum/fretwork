## 1. Footer link

- [x] 1.1 Move `PROJECT_URL` to `src/project.ts` and import it in `PrivacyView`. Verify that the existing privacy tests pass unchanged.
- [x] 1.2 Add the "GitHub" link to the footer between "Privacy" and the version (`target="_blank"`, `rel="noopener noreferrer"`), styled like the footer's other link. Verify with a jsdom test: the link is present on setup and the metronome, is hidden during a count-in, has the right attributes, and has the same URL as the privacy page's link.

## 2. Checks

- [x] 2.1 Look at the footer in Chrome in light and dark mode. Verify that `npm test`, `npm run lint`, `npm run build` and `openspec validate add-footer-repo-link --strict` all pass.
