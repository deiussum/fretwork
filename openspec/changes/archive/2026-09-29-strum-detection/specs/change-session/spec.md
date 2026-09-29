## ADDED Requirements

### Requirement: Counting mode
The setup screen SHALL let the player choose between Manual and Mic counting. On first launch the mode SHALL be Manual. Mic mode SHALL be selectable only when an audio input is open.

#### Scenario: First launch
- **WHEN** the player opens the app for the first time
- **THEN** Manual counting is selected

#### Scenario: Mic mode session
- **WHEN** Mic mode is selected with an open input and the player presses Space
- **THEN** the session runs with automatic strum counting

## MODIFIED Requirements

### Requirement: Timed run with visual countdown
The system SHALL run for exactly 60 seconds after the "go" sound. It SHALL display the remaining time as whole seconds, in a size readable from about 2 metres on a desktop monitor, together with the current chord pair. In Mic mode it SHALL also display the live strum count, updated within 100 ms of each detected strum.

#### Scenario: Countdown display
- **WHEN** 13.4 seconds of the run have elapsed
- **THEN** the display shows 0:47 and the current pair

#### Scenario: Live count in Mic mode
- **WHEN** 23 strums have been detected during a Mic mode run
- **THEN** the run screen shows a count of 23 alongside the countdown

#### Scenario: No count in Manual mode
- **WHEN** a Manual mode run is in progress
- **THEN** no strum count is shown

### Requirement: Score confirmation
After a run ends, the system SHALL show a score entry that accepts a whole number from 0 to 999, with the input focused so the player can type immediately. Enter SHALL save a valid score. Escape SHALL discard the attempt without saving. The score entry SHALL support being prefilled with a suggested value, which the player can edit before confirming. In Mic mode the entry SHALL be prefilled with the detected strum count. In both modes the screen SHALL state that the score is the number of strums played.

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

#### Scenario: Mic mode prefill
- **WHEN** a Mic mode run ends with 34 detected strums
- **THEN** the score entry shows 34, selected so typing replaces it, and Enter saves 34

#### Scenario: Counting rule shown
- **WHEN** the score entry is shown in either mode
- **THEN** the screen explains that the score is the number of strums played
