## 1. Logo and icons

- [x] 1.1 Replace `public/favicon.svg` with the Inlay mark (geometry from design.md), using literal light colours and a `prefers-color-scheme: dark` style for the dark ones. Add `src/ui/Logo.tsx`, the same shapes as an inline SVG using `var(--accent)` and `var(--bg)`. Verify with a unit test that the tile, frets and dot attributes in `Logo.tsx` and `favicon.svg` are identical, and that the favicon contains the dark media query.
- [x] 1.2 Add `scripts/icons.sh` (renders via `nix run nixpkgs#resvg`): `favicon-32.png`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, and `icon-maskable-512.png` (a full-bleed tile with the mark at 85% scale). Run it and commit the PNGs. Verify with a unit test that reads each PNG's IHDR header and checks its size, and by viewing the maskable icon to confirm the mark sits inside the central 80%.
- [x] 1.3 Add `public/manifest.webmanifest` (fields from design.md) and the head tags in `index.html`: SVG and PNG icons, apple-touch-icon, manifest, and two `theme-color` metas with media queries. Verify with a unit test that the manifest parses, has the required fields, and lists icon files that exist in `public/` with matching sizes. Also check that `dist/` contains them after `npm run build`.

## 2. Header lockup and home link

- [x] 2.1 Add the `site-header` to the shell: the lockup (`<a href="/" class="home">` with `Logo` and the two-tone wordmark, accessible name "Fretwork, home") on the left and the tool switcher beside it. Show it under the switcher's condition and on the privacy page. Verify with jsdom tests that the lockup shows on setup, the metronome and the privacy page, and is hidden during a count-in.
- [x] 2.2 Implement `goHome()` (tool `changes`, close the privacy page, increment `homeRequest`), and make `ChangesTool` reset its view to `practice` when `homeRequest` changes. Verify with jsdom tests for the spec scenarios: from a playing metronome (stops, setup shown), from history (setup shown, pair kept), and from the privacy page.
- [x] 2.3 Style the header: flex row with a bottom border, wrapping on narrow screens; mark 28 px, wordmark 22 px bold, "fret" in `var(--accent)`. Verify in Chrome in light and dark mode, and at phone width (390 px), with no horizontal scroll.

## 3. Docs and checks

- [x] 3.1 Put the logo at the top of the README. Verify that the image path resolves on GitHub (a relative path to `public/favicon.svg`).
- [x] 3.2 Check the production build in Chrome (`vite preview`): the tab shows the new favicon, the manifest is detected with no errors in the application panel or `navigator`, the theme colour applies, and there are no CSP violations. Remove test data from `localStorage` afterwards.
- [x] 3.3 Verify that `npm test`, `npm run lint`, `npm run build`, `nix flake check` and `openspec validate add-branding --strict` all pass.
