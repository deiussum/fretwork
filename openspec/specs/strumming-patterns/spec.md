# strumming-patterns Specification

## Purpose

A practice tool for strumming rhythm. It plays a strumming pattern as a moving grid over a metronome, with an optional guide sound for each stroke, and lets the player choose from built-in patterns or make their own. It is rhythm only: the player strums whatever chords they like.

## Requirements

### Requirement: Pattern structure
A pattern SHALL have a name, a number of beats per bar (1 to 12), a subdivision, and one or more bars (up to 4). The subdivision SHALL be 8ths (2 slots per beat), 16ths (4 slots per beat) or triplets (3 slots per beat). Each slot SHALL hold one stroke:
- **hit:** a normal strum
- **accent:** a strum played louder
- **chuck:** a muted, percussive strum
- **miss:** the hand moves past the strings without touching them

A pattern SHALL contain at least one slot that is not a miss.

In this spec a pattern is written one character per slot: `x` hit, `>` accent, `c` chuck, `.` miss, with bars separated by `|`.

#### Scenario: Old faithful
- **WHEN** a 4-beat, 8ths pattern is `x.xx.xxx`
- **THEN** it has 8 slots: a hit on 1, a miss on its "&", hits on 2 and its "&", a miss on 3, and hits on the "&" of 3, on 4 and on the "&" of 4

#### Scenario: Two-bar pattern
- **WHEN** a 4-beat, 8ths pattern is `x.xx.xxx|x.xx.x..`
- **THEN** it is 2 bars long and repeats every 2 bars

### Requirement: Strum direction
In 8ths and 16ths patterns, the direction of each slot SHALL follow from its position: even slots (counting from 0 within the bar) are down, odd slots are up. In triplet patterns, each slot SHALL have its own direction, set in the pattern. A new triplet beat SHALL default to down, up, down. Direction SHALL apply to misses too, so the display shows where the hand is going.

#### Scenario: Derived direction
- **WHEN** a 16ths pattern is shown
- **THEN** slots "1", "&" are marked down and "e", "a" are marked up

#### Scenario: Triplet direction
- **WHEN** a triplet pattern sets its first beat to down, down, up
- **THEN** those three slots are shown and played as down, down, up

### Requirement: Swing
8ths and 16ths patterns SHALL have a swing amount from 0% to 100%. Slots are taken in pairs: an 8th pair in an 8ths pattern, a 16th pair in a 16ths pattern. At 0% swing the second slot of each pair falls halfway through the pair. At 100% it falls two-thirds of the way through (a triplet feel). Between those, its position SHALL move linearly. Triplet patterns SHALL NOT have swing.

#### Scenario: Straight 8ths
- **WHEN** an 8ths pattern with 0% swing plays at 120 BPM
- **THEN** the "&" of each beat falls 0.25 s after the beat

#### Scenario: Full swing
- **WHEN** an 8ths pattern with 100% swing plays at 120 BPM
- **THEN** the "&" of each beat falls 0.333 s after the beat

#### Scenario: Swung 16ths
- **WHEN** a 16ths pattern with 100% swing plays at 60 BPM
- **THEN** "e" falls 0.333 s after "1", "&" 0.5 s after it, and "a" 0.833 s after it

### Requirement: Preset patterns
The tool SHALL include built-in patterns that cannot be edited or deleted. All are in 4 beats per bar, 1 bar long and unswung unless stated. The presets SHALL include at least:

| Name | Subdivision | Slots |
|---|---|---|
| Quarter downs | 8ths | `x.x.x.x.` |
| Down-ups | 8ths | `xxxxxxxx` |
| Old faithful | 8ths | `x.xx.xxx` |
| Backbeat chuck | 8ths | `x.cxx.cx` |
| Reggae skank | 8ths | `.c.c.c.c` |
| Shuffle | 8ths, 100% swing | `x.xx.xxx` |
| Folk 16ths | 16ths | `x.xxx.xxx.xxx.xx` |
| Triplet down-up-down | triplets, each beat down, up, down | `xxxxxxxxxxxx` |

The first time the tool opens, Old faithful SHALL be selected.

#### Scenario: Presets listed
- **WHEN** the player opens the strumming tool for the first time
- **THEN** the pattern list shows the presets and Old faithful is selected

#### Scenario: Presets are read-only
- **WHEN** a preset is selected
- **THEN** it offers Duplicate but not Edit or Delete

### Requirement: Custom patterns
The player SHALL be able to create a new pattern, duplicate any pattern (preset or custom) into a new custom pattern, edit a custom pattern, and delete a custom pattern. Deleting SHALL ask for confirmation in the page, not with a browser dialog. Custom patterns SHALL be listed after the presets, and the player's choice of pattern SHALL be kept when switching tools.

#### Scenario: Duplicate a preset
- **WHEN** the player duplicates Old faithful
- **THEN** a custom pattern named "Old faithful (copy)" with the same slots opens in the editor

#### Scenario: Delete the selected pattern
- **WHEN** the player deletes the selected custom pattern and confirms
- **THEN** it is removed and Old faithful is selected

### Requirement: Pattern editor
The editor SHALL let the player set the name, beats per bar, subdivision, number of bars and swing (8ths and 16ths only). It SHALL show the grid of slots with their counts. Choosing a slot SHALL cycle its stroke through hit, accent, chuck, miss and back to hit. In triplet patterns, each slot SHALL also have a direction control that flips between down and up. Changing the beats per bar, subdivision or bars SHALL keep the strokes of slots that still exist, start new slots as misses, and reset directions to down, up, down for each beat if the subdivision changes to triplets. Saving SHALL be refused with a message when the name is empty or every slot is a miss. Cancel and Escape SHALL leave the editor without saving. The editor SHALL be usable with mouse or keyboard.

The editor SHALL open only while stopped. Opening it while playing SHALL stop playback first.

#### Scenario: Cycle a slot
- **WHEN** a slot is a hit and the player chooses it three times
- **THEN** it becomes accent, then chuck, then miss

#### Scenario: Empty pattern refused
- **WHEN** every slot is a miss and the player saves
- **THEN** the pattern is not saved and the player is told it needs at least one strum

#### Scenario: Change subdivision
- **WHEN** a 4-beat 8ths pattern `x.xx.xxx` is changed to 16ths
- **THEN** it has 16 slots, the first 8 are `x.xx.xxx` and the rest are misses

#### Scenario: Swing hidden for triplets
- **WHEN** the subdivision is triplets
- **THEN** no swing control is shown

### Requirement: Count labels
Each slot SHALL be labelled with its count: "1 &" for 8ths, "1 e & a" for 16ths and "1 trip let" for triplets, with the beat number changing on each beat.

#### Scenario: 16ths labels
- **WHEN** a 2-beat 16ths pattern is shown
- **THEN** its slots are labelled 1, e, &, a, 2, e, &, a

### Requirement: Playback
Space SHALL start playback when stopped and stop it when playing, and Escape SHALL stop it. Playback SHALL begin with one count-in bar of metronome clicks at the pattern's beats per bar, with the first click accented, then repeat the pattern bar by bar until stopped. The first count-in click SHALL sound within 200 ms of starting. After the count-in, what sounds is set by the sound choice (see Sound choice). Stopping SHALL silence every sound that has not yet sounded. The first start after the page loads SHALL make audio audible, so browser autoplay restrictions never silence it.

#### Scenario: Count-in
- **WHEN** a 4-beat pattern is selected at 60 BPM and the player presses Space
- **THEN** four clicks sound 1 s apart, then the pattern's first bar begins on the next beat

#### Scenario: Stop
- **WHEN** the pattern is playing and the player presses Escape
- **THEN** no further clicks or guide sounds play

### Requirement: Sound choice
After the count-in, the player SHALL be able to hear the metronome click, the guide sound, or both. The choices are **Click**, **Guide** and **Both**, and the default SHALL be Both. The count-in SHALL always click, whatever the choice. The player SHALL be able to change the choice at any time. A change while playing SHALL take effect within 150 ms, without restarting the bar.

#### Scenario: Guide only
- **WHEN** the sound choice is Guide and the player starts a pattern
- **THEN** the count-in clicks, and from the first pattern bar only guide sounds play

#### Scenario: Click only
- **WHEN** the sound choice is Click and a pattern is playing
- **THEN** the click sounds on every beat and no guide sounds play

#### Scenario: Both to Click while playing
- **WHEN** the pattern is playing with Both and the player chooses Click
- **THEN** guide sounds stop within 150 ms and the click continues

#### Scenario: Both to Guide while playing
- **WHEN** the pattern is playing with Both and the player chooses Guide
- **THEN** clicks stop within 150 ms and the guide continues

### Requirement: Guide sound
With the sound choice set to Guide or Both, the system SHALL play a sound on every slot that is not a miss, at that slot's time:
- a down hit and an up hit at clearly different pitches, with the up stroke higher
- an accent at the same pitch as its direction, but clearly louder
- a chuck as a short, low, percussive sound, the same for both directions
- nothing on a miss

The guide sounds SHALL be clearly different from the metronome click. The guide SHALL NOT sound during the count-in. Each guide sound SHALL be within 5 ms of its slot time.

#### Scenario: Old faithful guide
- **WHEN** Old faithful plays with the sound choice set to Guide
- **THEN** each bar plays guide sounds down (1), down (2), up (& of 2), up (& of 3), down (4), up (& of 4), and nothing on the misses

### Requirement: Grid display
The tool SHALL show the selected pattern as a grid of slots. Each slot shows its stroke, its direction (down or up arrow) and its count. Hits, accents, chucks and misses SHALL look clearly different from one another. While playing, the current slot SHALL be highlighted, changing within 50 ms of the slot's time, and the current beat SHALL be shown. During the count-in, the display SHALL show the count-in beats rather than the pattern cursor. The current bar's grid SHALL be readable from about 2 m on a desktop monitor. For patterns longer than one bar, the bar being played and its position in the pattern SHALL be shown. Within each beat, slots SHALL be spaced in proportion to when they sound, so a swung pattern looks different from the same pattern played straight. A pattern with swing SHALL show its amount ("Swing 60%") next to its name on the player and in the pattern list.

#### Scenario: Following the pattern
- **WHEN** a 4-beat 8ths pattern plays and the "&" of beat 3 is reached
- **THEN** the sixth slot is highlighted

#### Scenario: Swing is visible
- **WHEN** Shuffle (100% swing) is shown
- **THEN** each "&" is drawn two-thirds of the way through its beat rather than halfway, and "Swing 100%" is shown with its name in the player and the pattern list, while Old faithful shows no swing label

#### Scenario: Multi-bar position
- **WHEN** a 2-bar pattern is playing its second bar
- **THEN** the second bar's grid is shown with "bar 2 of 2"

### Requirement: Tempo and speed trainer
The tool SHALL offer the same tempo range, tempo keys, tap tempo and speed trainer as the metronome, with the same rules for tempo changes while playing and for shifting the trainer ramp. The count-in bar SHALL be bar 0 of the speed trainer's ramp. Its settings SHALL be separate from the standalone metronome's, so changing one does not change the other. The default tempo SHALL be 80 BPM.

#### Scenario: Separate tempo
- **WHEN** the metronome is set to 120 BPM and the strumming tool to 70 BPM
- **THEN** each keeps its own tempo

#### Scenario: Trainer ramp
- **WHEN** the trainer is set to start 60, step 5, every 4 bars, target 80, and the player starts
- **THEN** the count-in and the first three pattern bars play at 60 BPM, and the next four at 65 BPM

### Requirement: Changing pattern while playing
The player SHALL be able to select a different pattern while playing. The new pattern SHALL start from its first bar at the next bar boundary, with its own beats per bar from then on. The current bar SHALL finish as it was.

#### Scenario: Switch on the fly
- **WHEN** Old faithful is playing beat 2 and the player selects Down-ups
- **THEN** the rest of the bar plays Old faithful and the next bar plays Down-ups

### Requirement: Keyboard control
The tool SHALL be fully usable from the keyboard outside the editor:
- Space starts and stops.
- Escape stops.
- Arrow Up and Arrow Down change the tempo by 1 BPM, or by 5 BPM with Shift held.
- Arrow Left and Arrow Right select the previous and next pattern in the list.
- T taps the tempo.
- S turns the speed trainer on or off while stopped.
- G moves the sound choice from Both to Guide, to Click, and back to Both.

While a text or number field has focus, these shortcuts SHALL NOT apply, except that Enter SHALL confirm the field and move focus out of it, and Escape SHALL stop playback. While the editor is open, these shortcuts SHALL NOT apply.

#### Scenario: Next pattern
- **WHEN** Old faithful is selected and the player presses Arrow Right
- **THEN** the pattern after it in the list is selected

#### Scenario: Cycle the sound
- **WHEN** the sound choice is Both and the player presses G three times
- **THEN** it becomes Guide, then Click, then Both

#### Scenario: Editor keeps its keys
- **WHEN** the editor is open and the player presses Space
- **THEN** playback does not start

### Requirement: Background timing
Playback SHALL keep accurate time while the browser tab is hidden or another tab is in front, for at least 10 minutes. Clicks and guide sounds SHALL stay within 5 ms of their times, with none missed or bunched, and the speed trainer SHALL continue to step on schedule.

#### Scenario: Switch tabs while playing
- **WHEN** Old faithful plays at 90 BPM with Both and the player switches to another tab for 10 minutes
- **THEN** clicks and guide sounds continue on time throughout, with no gaps

### Requirement: Expected stroke timeline
While playing, the system SHALL know the time of every scheduled slot that is not a miss, along with its bar, slot, stroke and direction, using the same timing as the guide sound. This SHALL be available whatever the sound choice, so that strums can later be compared against it.

#### Scenario: Click only
- **WHEN** Old faithful plays at 120 BPM with the sound choice set to Click
- **THEN** the expected strokes of each pattern bar are at 0, 0.5, 0.75, 1.25, 1.5 and 1.75 s after the bar starts

### Requirement: Remembered patterns and settings
The system SHALL remember the following between visits:
- custom patterns
- the selected pattern
- tempo
- whether the speed trainer is on, and its four settings
- the sound choice

Stored values that are missing or invalid SHALL fall back to their defaults. An invalid stored custom pattern SHALL be skipped without affecting the others. When the remembered pattern no longer exists, Old faithful SHALL be selected. If browser storage is unavailable, the tool SHALL still work, and custom patterns and settings SHALL last for the current page only, with a note that they will not be saved.

#### Scenario: Return later
- **WHEN** the player creates a pattern, selects it at 72 BPM, closes the page and opens it again
- **THEN** that pattern is selected at 72 BPM

#### Scenario: Storage unavailable
- **WHEN** browser storage throws on access
- **THEN** patterns can still be created and played, and the player is told they will not be saved
