# chord-pair-selection Specification

## Purpose

Lets the player choose which two chords to practise changing between in a "1 minute changes" session. Pairs are identified consistently so results can be tracked per pair.

## Requirements

### Requirement: Built-in chord list
The system SHALL provide a built-in list of common open chords to choose from, containing at least: A, Am, A7, B7, C, C7, D, Dm, D7, E, Em, E7, Fmaj7, G, G7.

#### Scenario: Chord list available
- **WHEN** the player opens chord pair selection
- **THEN** every chord in the built-in list is available for both chord slots

### Requirement: Select two distinct chords
The system SHALL require exactly two different chords to be selected before a session can start.

#### Scenario: Valid pair selected
- **WHEN** the player selects A for the first chord and D for the second chord
- **THEN** the pair A↔D is shown as the current pair and starting a session is enabled

#### Scenario: Same chord selected twice
- **WHEN** the player selects the same chord for both slots
- **THEN** starting a session is disabled and the player is told the chords must differ

### Requirement: Pairs are unordered
The system SHALL treat a chord pair as unordered, so that X↔Y and Y↔X identify the same pair for history and personal bests.

#### Scenario: Reversed selection matches existing pair
- **WHEN** the player has results for A↔D and then selects D first and A second
- **THEN** the system shows the personal best and history for A↔D

### Requirement: Remember last pair
The system SHALL preselect the most recently practised pair when the app is opened.

#### Scenario: Reopen app
- **WHEN** the player last practised C↔G and reopens the app
- **THEN** C↔G is preselected as the current pair
