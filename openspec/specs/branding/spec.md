# branding Specification

## Purpose

Gives Fretwork a simple, recognisable identity: the logo and wordmark in the app, the icons browsers and devices show, and what is needed to install it as an app.

## Requirements

### Requirement: Logo and wordmark
The app SHALL use one logo, the "Inlay" mark: two horizontal frets and a centred position dot on a rounded square tile in the accent colour, with the frets and dot in the background colour. The wordmark SHALL be the lowercase name "fretwork" in the app's font, bold, with "fret" in the accent colour and "work" in the text colour. Both SHALL follow the light and dark colour schemes.

#### Scenario: Dark mode
- **WHEN** the player's system uses a dark colour scheme
- **THEN** the mark's tile and the "fret" part of the wordmark use the dark theme's accent colour, and "work" uses its text colour

### Requirement: Favicon and app icons
The browser tab SHALL show the logo as an SVG favicon that switches between the light and dark tile colours with the system colour scheme. The app SHALL also provide PNG icons of the logo:
- 32 px, for browsers without SVG favicons
- a 180 px Apple touch icon
- 192 px and 512 px app icons
- a 512 px maskable icon, with the mark inside the maskable safe zone

The default Vite icon SHALL NOT be shipped.

#### Scenario: Browser tab
- **WHEN** the app is open in a browser tab
- **THEN** the tab shows the Inlay mark

### Requirement: Installable app
The app SHALL provide a web app manifest with:
- the name and short name "Fretwork"
- start URL `/`
- standalone display
- the app icons
- background and theme colours from the palette

The manifest and icons SHALL be served from the app's own site, so they need no change to the Content-Security-Policy.

#### Scenario: Install
- **WHEN** a player installs Fretwork from a browser that supports installing web apps
- **THEN** it opens in its own window with the name "Fretwork" and the Inlay icon

### Requirement: Theme colour
The page SHALL set the browser's theme colour to the app's background colour, the light one in light mode and the dark one in dark mode.

#### Scenario: Light mode toolbar
- **WHEN** the system uses a light colour scheme in a browser that tints its toolbar
- **THEN** the toolbar uses the light background colour
