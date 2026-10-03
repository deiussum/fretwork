## 1. Preset

- [x] 1.1 Add the Wonderwall preset (`preset:wonderwall`, 16ths, 2 bars, straight) after Folk 16ths in `strummingPresets.ts`. Verify with a unit test that it is valid, is 2 bars long, and that its strum directions are D D D D U D U D D D U and D U D D D U U U D U D U.
- [x] 1.2 Verify that `npm test`, `npm run lint`, `npm run build` and `openspec validate add-wonderwall-preset --strict` all pass, and check in Chromium that Wonderwall shows "Bar 1 of 2" and "Bar 2 of 2" on the player.
