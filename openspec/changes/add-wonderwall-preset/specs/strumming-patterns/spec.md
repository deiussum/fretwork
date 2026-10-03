## MODIFIED Requirements

### Requirement: Preset patterns
The tool SHALL include built-in patterns that cannot be edited or deleted. All are in 4 beats per bar, 1 bar long and unswung unless stated; bars are separated by `|`. The presets SHALL include at least:

| Name | Subdivision | Slots |
|---|---|---|
| Quarter downs | 8ths | `x.x.x.x.` |
| Down-ups | 8ths | `xxxxxxxx` |
| Old faithful | 8ths | `x.xx.xxx` |
| Backbeat chuck | 8ths | `x.cxx.cx` |
| Reggae skank | 8ths | `.c.c.c.c` |
| Shuffle | 8ths, 100% swing | `x.xx.xxx` |
| Folk 16ths | 16ths | `x.xxx.xxx.xxx.xx` |
| Wonderwall | 16ths, 2 bars | `x.x.x.xxxxx.x.xx\|xxx.x.xx.x.xxxxx` |
| Triplet down-up-down | triplets, each beat down, up, down | `xxxxxxxxxxxx` |

The first time the tool opens, Old faithful SHALL be selected.

#### Scenario: Presets listed
- **WHEN** the player opens the strumming tool for the first time
- **THEN** the pattern list shows the presets and Old faithful is selected

#### Scenario: Presets are read-only
- **WHEN** a preset is selected
- **THEN** it offers Duplicate but not Edit or Delete

#### Scenario: Wonderwall
- **WHEN** the player selects the Wonderwall preset
- **THEN** it plays two bars of 16ths, the first strummed D D D D U D U D D D U and the second D U D D D U U U D U D U, then repeats
