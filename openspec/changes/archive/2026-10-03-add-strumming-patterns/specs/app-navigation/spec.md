## MODIFIED Requirements

### Requirement: Tool switcher
The system SHALL offer a tool switcher with "1 minute changes", "Strumming" and "Metronome", in that order. When the page opens, 1 minute changes SHALL be shown. The switcher SHALL be available on the 1 minute changes setup and history views, on the metronome whether it is stopped or playing, and on the strumming tool whether it is stopped or playing. It SHALL be hidden while a 1 minute changes session is in its count-in, run, score confirmation or result, and while the strumming pattern editor is open.

#### Scenario: Open the metronome
- **WHEN** the player is on the 1 minute changes setup screen and chooses Metronome
- **THEN** the metronome is shown

#### Scenario: Open the strumming tool
- **WHEN** the player is on the metronome and chooses Strumming
- **THEN** the strumming tool is shown with the pattern selected last time

#### Scenario: Tool order
- **WHEN** the tool switcher is shown
- **THEN** it lists 1 minute changes, Strumming and Metronome, in that order

#### Scenario: No switching mid-session
- **WHEN** a 1 minute changes count-in or run is in progress
- **THEN** the tool switcher is not shown

#### Scenario: No switching while editing
- **WHEN** the strumming pattern editor is open
- **THEN** the tool switcher is not shown

### Requirement: Keyboard shortcuts belong to the active tool
Keyboard shortcuts SHALL apply only to the tool currently shown.

#### Scenario: Space on the metronome
- **WHEN** the metronome is shown and the player presses Space
- **THEN** the metronome starts and no 1 minute changes session begins

#### Scenario: Space on 1 minute changes
- **WHEN** 1 minute changes setup is shown with a valid pair and the player presses Space
- **THEN** the count-in begins and the metronome does not start

#### Scenario: Space on the strumming tool
- **WHEN** the strumming tool is shown and the player presses Space
- **THEN** the pattern starts, and neither the metronome nor a 1 minute changes session starts

### Requirement: Leaving the metronome stops it
Switching away from the metronome or the strumming tool SHALL stop it, so that no clicks or guide sounds from a tool sound while another tool is shown.

#### Scenario: Switch while playing
- **WHEN** the metronome is playing and the player switches to 1 minute changes
- **THEN** no further metronome clicks sound

#### Scenario: Switch away from strumming
- **WHEN** a strumming pattern is playing and the player switches to the metronome
- **THEN** no further strumming clicks or guide sounds play

### Requirement: Home link
The header SHALL show the logo and wordmark at the upper left, beside the tool switcher, wherever the tool switcher is shown and on the privacy page. Choosing it SHALL show the 1 minute changes setup screen. This applies from the metronome and the strumming tool (which then stop), from the history view and from the privacy page, and 1 minute changes SHALL keep its selected pair. It SHALL be keyboard-operable as a link.

#### Scenario: From the metronome
- **WHEN** the metronome is playing and the player chooses the logo
- **THEN** the metronome stops and the 1 minute changes setup screen is shown

#### Scenario: From the strumming tool
- **WHEN** a strumming pattern is playing and the player chooses the logo
- **THEN** playback stops and the 1 minute changes setup screen is shown

#### Scenario: From history
- **WHEN** the 1 minute changes history view is shown and the player chooses the logo
- **THEN** the setup screen is shown with the same pair selected

#### Scenario: Not during a session
- **WHEN** a 1 minute changes count-in or run is in progress
- **THEN** the logo link is not shown
