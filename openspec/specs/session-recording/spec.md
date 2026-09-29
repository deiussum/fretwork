# session-recording Specification

## Purpose

Captures real performances with the app's detected strums so they can be corrected by hand and used to tune and test the strum detector.

## Requirements

### Requirement: Recording is opt-in
The system SHALL provide a "Record sessions" setting, available in Mic mode and off by default. Nothing SHALL be recorded unless it is on.

#### Scenario: Default
- **WHEN** the player has never changed the setting
- **THEN** runs are not recorded

### Requirement: Record the session input
When recording is on, the system SHALL record the selected input channel from the first count-in click until the end of the run. Recordings SHALL stay in the browser's memory until exported and SHALL be discarded when the next session starts or the page closes.

#### Scenario: Recording a run
- **WHEN** recording is on and a Mic mode run completes
- **THEN** a recording covering the count-in and the full 60-second run is available

#### Scenario: Aborted run
- **WHEN** recording is on and the player aborts the run
- **THEN** no recording is offered

### Requirement: Export WAV and labels
After a recorded run, the confirm and result screens SHALL offer a download of the recording as a mono 16-bit PCM WAV at the input's sample rate, and of the detected strums as an Audacity label file. Label times SHALL be relative to the start of the WAV. Both files SHALL share a name made of the pair and the date and time, such as `fretwork-A-D-2026-09-29T10-15-00.wav` and `fretwork-A-D-2026-09-29T10-15-00.labels.txt`.

#### Scenario: Labels line up with audio
- **WHEN** the player imports the exported WAV and label file into Audacity
- **THEN** each label sits at the start of a detected strum in the waveform

#### Scenario: Label file format
- **WHEN** the label file is opened as text
- **THEN** each line is `<start>\t<end>\t<label>` with times in seconds, and start equal to end (a point label)
