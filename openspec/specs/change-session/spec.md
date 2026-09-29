# change-session Specification

## Purpose

Runs a single timed "1 minute changes" attempt for the selected chord pair: an audible count-in, a 60-second run, a clear end signal, and a score confirmation step. It is driven from the keyboard so the player's hands can stay on the guitar.

## Requirements

### Requirement: Keyboard-driven control
The system SHALL let the player control a session without the mouse: Space starts a session, Escape aborts a session in progress, and Enter confirms the score.

#### Scenario: Start with Space
- **WHEN** a valid chord pair is selected and the player presses Space on the setup screen
- **THEN** the count-in begins

#### Scenario: Space ignored while running
- **WHEN** a count-in or run is in progress and the player presses Space
- **THEN** the session continues unaffected

### Requirement: Audible count-in
The system SHALL play a count-in of 4 evenly spaced clicks, one second apart, before the run starts. It SHALL then play a distinct "go" sound one interval after the last click, marking the start of the run. The count-in number SHALL be shown on screen.

#### Scenario: Count-in sequence
- **WHEN** the player starts a session
- **THEN** the system plays 4 clicks at 1-second intervals while displaying 4, 3, 2, 1, then plays the "go" sound and the 60-second run begins at the moment of the "go" sound

#### Scenario: Even timing
- **WHEN** the count-in plays
- **THEN** the interval between consecutive sounds deviates by no more than 5 ms from 1 second, even while the UI is busy rendering

### Requirement: Timed run with visual countdown
The system SHALL run for exactly 60 seconds after the "go" sound. It SHALL display the remaining time as whole seconds, in a size readable from about 2 metres on a desktop monitor, together with the current chord pair.

#### Scenario: Countdown display
- **WHEN** 13.4 seconds of the run have elapsed
- **THEN** the display shows 0:47 and the current pair

### Requirement: End signal
The system SHALL play a distinct end sound, different from the count-in click and the "go" sound, exactly when the 60-second run ends. It SHALL then move to score confirmation.

#### Scenario: Run ends
- **WHEN** 60 seconds have elapsed since the "go" sound
- **THEN** the end sound plays and the score confirmation screen is shown

### Requirement: Abort session
The system SHALL let the player abort during the count-in or the run. An aborted session SHALL stop all scheduled sounds, record nothing, and return to the setup screen with the same pair selected.

#### Scenario: Abort during run
- **WHEN** the player presses Escape 20 seconds into a run
- **THEN** no further sounds play, no result is saved, and the setup screen is shown with the same pair selected

#### Scenario: Abort during count-in
- **WHEN** the player presses Escape after the second count-in click
- **THEN** the remaining clicks and the "go" sound do not play and the setup screen is shown

### Requirement: Score confirmation
After a run ends, the system SHALL show a score entry that accepts a whole number from 0 to 999, with the input focused so the player can type immediately. Enter SHALL save a valid score. Escape SHALL discard the attempt without saving. The score entry SHALL support being prefilled with a suggested value, which the player can edit before confirming.

#### Scenario: Enter a valid score
- **WHEN** the run has ended and the player types 34 and presses Enter
- **THEN** the result is saved and the result screen is shown

#### Scenario: Invalid score
- **WHEN** the player types -3 or "abc" or 1000 and presses Enter
- **THEN** nothing is saved and the player is told the score must be a whole number from 0 to 999

#### Scenario: Discard attempt
- **WHEN** the score entry is shown and the player presses Escape
- **THEN** nothing is saved and the setup screen is shown

#### Scenario: Prefilled suggestion
- **WHEN** a suggested value of 36 is supplied to score confirmation
- **THEN** the input shows 36, the player can change it to 34, and Enter saves 34

### Requirement: Result screen
After a score is saved, the system SHALL show the score, the previous score and personal best for the pair from before this attempt, and whether this attempt is a new personal best. From the result screen, Space SHALL start another session with the same pair and Escape SHALL return to setup.

#### Scenario: New personal best
- **WHEN** the previous best for A↔D was 30 and the player saves 34
- **THEN** the result screen shows 34, the previous best of 30, and a "new personal best" indication

#### Scenario: Repeat same pair
- **WHEN** the result screen is shown and the player presses Space
- **THEN** a new count-in begins for the same pair

### Requirement: Audio unlock
The system SHALL start its audio from the player's first start action, so that browser autoplay restrictions never silence the count-in.

#### Scenario: First session after page load
- **WHEN** the page has just loaded and the player presses Space to start
- **THEN** the first count-in click is audible
