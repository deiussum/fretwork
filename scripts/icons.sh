#!/usr/bin/env bash
# Render the PNG icons from public/favicon.svg (light colours) with resvg from
# nixpkgs, so no image library is needed in package.json. Run after changing
# the mark, then commit the PNGs:
#
#   scripts/icons.sh
set -euo pipefail

cd "$(dirname "$0")/../public"
resvg() { nix run nixpkgs#resvg -- "$@"; }

for spec in favicon-32.png:32 apple-touch-icon.png:180 icon-192.png:192 icon-512.png:512; do
  resvg -w "${spec#*:}" -h "${spec#*:}" favicon.svg "${spec%%:*}"
done

# Maskable: full-bleed tile, mark scaled to 85% around the centre so it stays
# inside the safe zone (a circle of radius 40% of the icon).
maskable=$(mktemp --suffix=.svg)
trap 'rm -f "$maskable"' EXIT
cat > "$maskable" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#b4531a"/>
  <g transform="translate(16 16) scale(0.85) translate(-16 -16)" fill="#f7f5f0" stroke="#f7f5f0">
    <g stroke-width="3" stroke-linecap="round">
      <line x1="7" y1="9.5" x2="25" y2="9.5"/>
      <line x1="7" y1="22.5" x2="25" y2="22.5"/>
    </g>
    <circle stroke="none" cx="16" cy="16" r="3.2"/>
  </g>
</svg>
SVG
resvg -w 512 -h 512 "$maskable" icon-maskable-512.png
