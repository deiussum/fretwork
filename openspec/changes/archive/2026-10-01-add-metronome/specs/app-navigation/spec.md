## Purpose

Lets the player move between Fretwork's practice tools. It makes sure that keyboard shortcuts and sound belong only to the tool on screen.

## ADDED Requirements

### Requirement: Tool switcher
The system SHALL offer a tool switcher with "1 minute changes" and "Metronome". When the page opens, 1 minute changes SHALL be shown. The switcher SHALL be available on the 1 minute changes setup and history views, and on the metronome whether it is stopped or playing. It SHALL be hidden while a 1 minute changes session is in its count-in, run, score confirmation or result.

#### Scenario: Open the metronome
- **WHEN** the player is on the 1 minute changes setup screen and chooses Metronome
- **THEN** the metronome is shown

#### Scenario: No switching mid-session
- **WHEN** a 1 minute changes count-in or run is in progress
- **THEN** the tool switcher is not shown

### Requirement: Keyboard shortcuts belong to the active tool
Keyboard shortcuts SHALL apply only to the tool currently shown.

#### Scenario: Space on the metronome
- **WHEN** the metronome is shown and the player presses Space
- **THEN** the metronome starts and no 1 minute changes session begins

#### Scenario: Space on 1 minute changes
- **WHEN** 1 minute changes setup is shown with a valid pair and the player presses Space
- **THEN** the count-in begins and the metronome does not start

### Requirement: Leaving the metronome stops it
Switching away from the metronome SHALL stop it, so that no metronome clicks sound while another tool is shown.

#### Scenario: Switch while playing
- **WHEN** the metronome is playing and the player switches to 1 minute changes
- **THEN** no further metronome clicks sound
