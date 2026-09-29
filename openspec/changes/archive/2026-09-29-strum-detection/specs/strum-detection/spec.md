## Purpose

Counts strums automatically from the player's audio input during a run, with timing precise enough to record each strum's time and accuracy that is measured against labelled recordings.

## ADDED Requirements

### Requirement: Counting rule
The score for a run SHALL be the number of strums played between the "go" sound and the end of the run. Each strum counts once, including the first.

#### Scenario: Alternating strums
- **WHEN** the player strums A, D, A, D… for a total of 34 strums during the run
- **THEN** the detected count is 34

### Requirement: Only strums during the run are counted
The system SHALL count only strums that start after the "go" sound and before the end of the run. Strums during the count-in and after the end SHALL NOT be counted.

#### Scenario: Strum during count-in
- **WHEN** the player strums a test chord during the count-in
- **THEN** it is not counted

#### Scenario: Strum after the end
- **WHEN** the player strums after the end sound
- **THEN** it is not counted

### Requirement: Ignore the app's own sounds
The system SHALL NOT count the app's "go" sound or end sound as strums, even when a microphone picks them up.

#### Scenario: Speaker bleed into a room mic
- **WHEN** a laptop microphone hears the "go" sound through the speakers
- **THEN** the detected count does not include it

### Requirement: One count per strum
The system SHALL count strum onsets closer together than 250 ms as a single strum, so the strings rattling or a fast double strum is not counted twice.

#### Scenario: Double strum
- **WHEN** the player accidentally strums twice within 150 ms
- **THEN** one strum is counted

### Requirement: Strum timestamps
The system SHALL record the time of each counted strum, measured on the same clock as the session's sounds, as seconds after the "go" sound to millisecond precision. Each timestamp SHALL be within 20 ms of the strum's actual start.

#### Scenario: Timestamps recorded
- **WHEN** a Mic mode run ends with 34 counted strums
- **THEN** 34 increasing timestamps between 0 and 60 seconds are available for the result

### Requirement: Detection accuracy
Measured against hand-labelled recordings, a detected strum matches a labelled one if it is within 50 ms of it. The detector SHALL find at least 95% of labelled strums with at least 95% of detections matching a label on pickup or DI recordings. On acoustic-microphone recordings it SHALL find at least 90% of labelled strums with at least 90% of detections matching a label.

#### Scenario: Pickup fixture
- **WHEN** the detector runs over a labelled pickup recording at the default sensitivity
- **THEN** recall and precision are each at least 95%

#### Scenario: Microphone fixture
- **WHEN** the detector runs over a labelled acoustic-microphone recording at the default sensitivity
- **THEN** recall and precision are each at least 90%

### Requirement: Input lost during a run
If the audio input stops during a run (for example, the device is unplugged), the run SHALL continue to its end. The score SHALL NOT be prefilled, and the player SHALL be told the input was lost.

#### Scenario: Interface unplugged
- **WHEN** the audio interface is unplugged 30 seconds into a Mic mode run
- **THEN** the timer continues, and at the end the score entry is empty with a message that the input was lost
