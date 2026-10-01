## Why

Fretwork is now public, but it still shows Vite's default favicon and has no visible name or mark in the app. Each tool shows only its own heading. A simple, consistent identity makes the app recognisable in a browser tab, on a home screen and in the README. A home link in the header also gives people an obvious way back to the start.

## What Changes

- **Logo:** the "Inlay" mark, two frets and a position dot on a rounded tile in the app's accent colour, replaces Vite's favicon. It is an SVG favicon that follows light and dark mode, with PNG fallbacks: 32 px, a 180 px Apple touch icon, and 192 px and 512 px app icons, including a maskable one.
- **Header lockup:** the mark and the two-tone wordmark (lowercase, "fret" in the accent colour) sit at the upper left of the header, beside the tool switcher, wherever the switcher is shown. Choosing the lockup goes to the 1 minute changes setup screen, from the metronome, history or the privacy page.
- **Installable app:** a web app manifest, so Fretwork can be installed as an app with its own name, icon and window.
- **Theme colour:** the browser toolbar uses the app's background colour in light and dark mode.
- **README:** the logo at the top.
- **Not included:**
  - a custom font (the wordmark uses the app's system font)
  - a social preview image
  - offline support (a service worker)
  - changes to the session screens

## Capabilities

### New Capabilities
- `branding`: the app's logo and wordmark, the favicon and app icons, the web app manifest and the theme colour.

### Modified Capabilities
- `app-navigation`: adds the header lockup as a home link to the 1 minute changes setup screen.

## Impact

- `public/`:
  - a new `favicon.svg`
  - PNG icons generated from the SVG and committed
  - `manifest.webmanifest`
- `index.html`: icon, manifest and `theme-color` tags.
- `src/ui/`: a `Logo` component and the header lockup. The shell and `ChangesTool` gain a way to return to setup.
- `src/index.css`: header layout.
- `scripts/`: a script that regenerates the PNG icons from the SVG, run through Nix, so there's no new npm dependency.
- `README.md`: the logo.
- The CSP is unchanged, since the manifest and icons are served from the app's own site. The container and NixOS module serve the new files with their existing rules.
