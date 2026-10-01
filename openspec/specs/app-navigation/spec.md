# app-navigation Specification

## Purpose

Lets the player move between Fretwork's practice tools. It makes sure that keyboard shortcuts and sound belong only to the tool on screen.

## Requirements

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

### Requirement: Build version in the footer
The footer SHALL show the version of the running build next to the Privacy link: "v" followed by the release version, then the short commit id of the build when it is known. A development server SHALL show "dev". The version SHALL be fixed when the app is built, and showing it SHALL NOT need any network request.

#### Scenario: Release build
- **WHEN** version 0.1.0 is built from a git checkout at commit d933a13
- **THEN** the footer shows "v0.1.0 · d933a13"

#### Scenario: Built without git
- **WHEN** version 0.1.0 is built from a copy of the source that is not a git checkout
- **THEN** the footer shows "v0.1.0"

#### Scenario: Development server
- **WHEN** the app runs on the development server
- **THEN** the footer shows "dev"
