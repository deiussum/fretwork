## Context

See proposal.md for the motivation and specs/ for the behaviour.

The mark and wordmark were chosen from a concept sheet: mark "C · Inlay" with wordmark "1 · Two-tone". The palette already lives as CSS variables in `src/index.css`:
- light: `--bg #f7f5f0`, `--accent #b4531a`, `--text #1d1a16`
- dark: `--bg #16140f`, `--accent #e0803f`, `--text #f1ece3`

`public/favicon.svg` is Vite's default icon.

The shell (`App.tsx`) renders the tool switcher (`nav.tools`) only when the metronome is shown or a 1 minute changes session is idle. It hides the switcher on the privacy page. `ChangesTool` keeps its own Practice/History `view` state, and stays mounted while hidden so its pair survives. The production CSP is `default-src 'self'` with explicit directives. There's no `manifest-src`, so manifests fall back to `default-src 'self'`.

## Goals / Non-Goals

**Goals:**
- One drawing of the mark, used everywhere: in the app as an inline SVG component, and as the favicon and icon source file.
- No new npm dependencies and no network requests, so the privacy statement and CSP stay as they are.

**Non-Goals:**
- A custom or self-hosted font.
- A service worker or offline support.
- Social preview images.
- Changes to session screens.

## Decisions

### 1. The mark is a 32-unit SVG drawn once

The geometry is:
- a `viewBox="0 0 32 32"`
- a tile: `rect x=1 y=1 w=30 h=30 rx=7`
- frets: lines at `y=9.5` and `y=22.5` from `x=7` to `x=25`, with a stroke width of 3 and round caps
- a dot: `circle cx=16 cy=16 r=3.2`

It's drawn in two places that must stay identical:
- **`src/ui/Logo.tsx`:** an inline SVG using `var(--accent)` for the tile and `var(--bg)` for the frets and dot, so it follows the theme with no extra code.
- **`public/favicon.svg`:** the same shapes with literal colours, plus an embedded `<style>` with `@media (prefers-color-scheme: dark)` that switches to the dark colours. This works in browsers that support SVG favicons.

A unit test compares the shape attributes of both, so they can't drift apart.

### 2. PNG icons generated once with `resvg` through Nix, then committed

`scripts/icons.sh` renders `public/favicon.svg`, light variant, with `nix run nixpkgs#resvg`:
- `favicon-32.png`
- `apple-touch-icon.png` (180 px)
- `icon-192.png`
- `icon-512.png`

It also renders `icon-maskable-512.png` from a variant that drops the rounded tile for a full-bleed accent square, with the frets and dot scaled to 85% around the centre. Their farthest corner then sits about 11.9 units from the centre, inside the maskable safe zone (a circle of radius 12.8 units, 40% of the icon).

The PNGs are committed. They change only when the mark changes, so a build step or an npm image library (such as sharp) isn't worth it. A unit test reads each PNG's header and checks its dimensions.

**Alternatives considered:**
- Generating at build time with an npm dependency: adds a native dependency for files that rarely change.
- SVG-only icons: iOS touch icons and many install surfaces still need PNGs.

### 3. Manifest and head tags

`public/manifest.webmanifest`:
- `name` and `short_name`: "Fretwork"
- `start_url` and `scope`: `/`
- `display`: `standalone`
- `background_color`: `#f7f5f0`
- `theme_color`: `#b4531a`
- `icons`: the SVG (`any`), the 192 and 512 PNGs (`any`), and the maskable 512

`index.html` gains:
- `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`
- `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">`
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- `<link rel="manifest" href="/manifest.webmanifest">`
- two `<meta name="theme-color">` tags, using `media="(prefers-color-scheme: light|dark)"` with the two background colours

Vite copies `public/` as is. nginx's standard `mime.types` maps `.webmanifest` to `application/manifest+json`. These files aren't hashed, so they get the default caching in both serving configurations, which is acceptable for rarely changing files.

### 4. Lockup in a shell header, with a "go home" signal to ChangesTool

The shell wraps the lockup and the existing tool switcher in a `<header class="site-header">`. The lockup sits on the left: `<a href="/" class="home">`, containing `<Logo>` (`aria-hidden`) and the wordmark text, with the accessible name "Fretwork, home".

The lockup is shown under the same condition as the tool switcher, and also on the privacy page. There the switcher stays hidden but the lockup is a way back.

Clicking it calls `preventDefault()` and runs `goHome()`, which:
- sets the tool to `changes`
- closes the privacy page
- increments a `homeRequest` counter passed to `ChangesTool`

`ChangesTool` resets its `view` to `practice` when `homeRequest` changes, using React's "adjust state when a prop changes" pattern rather than an effect. Its pair state is untouched. Leaving the metronome stops it, as with any tool switch, because `MetronomeTool` unmounts.

**Alternative considered:** lifting `view` up into the shell. That spreads 1 minute changes state into the shell for one reset.

A real `<a href="/">` keeps it keyboard-operable, and middle-click opens a new tab. Space isn't handled by the lockup, so it doesn't conflict with the tools' Space shortcut.

### 5. Header layout

`.site-header` is a flex row: the lockup on the left and the tool switcher next to it, with a bottom border, taking the place of the switcher's current centred row. On narrow screens it wraps, so the switcher drops below the lockup. The wordmark is 22 px bold with `letter-spacing: -0.01em`, and the mark is 28 px.

## Risks / Trade-offs

- **[Risk]** Browsers cache favicons aggressively, so returning visitors may see the old Vite icon for a while. → Accepted. It clears on its own, and the file name stays `favicon.svg` on purpose so links elsewhere keep working.
- **[Risk]** Safari doesn't support SVG favicons. → The 32 px PNG and the Apple touch icon cover it.
- **[Trade-off]** The mark's geometry appears in both `Logo.tsx` and `favicon.svg`. → The unit test in decision 1 keeps them identical.
