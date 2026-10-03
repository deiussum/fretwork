## Why

The presets cover generic patterns but no well-known song. The Wonderwall strum is one of the most common songs beginners learn. It is a two-bar 16th pattern, so it also gives the presets their first multi-bar example.

## What Changes

- Add a **Wonderwall** preset: 4 beats per bar, 16ths, 2 bars, straight (no swing), as Justin Guitar teaches it:
  - bar 1 `x.x.x.xxxxx.x.xx` (D D D D U D U D D D U)
  - bar 2 `xxx.x.xx.x.xxxxx` (D U D D D U U U D U D U)
- It sits after Folk 16ths in the preset list. Old faithful stays the default.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `strumming-patterns`: the Preset patterns requirement lists Wonderwall.

## Impact

- `src/domain/strummingPresets.ts`: one new preset with a stable `preset:wonderwall` id.
- Tests that walk the preset list keep working, because they use the list's length.
- No change to stored data, the engine or the UI.
