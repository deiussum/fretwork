# audio-input Specification

## Purpose

Lets the player choose and monitor the audio input used for automatic strum counting, working with audio interfaces and ordinary microphones alike, and remembers that setup between visits.

## Requirements

### Requirement: Permission only when needed
The system SHALL NOT request microphone permission or open any audio input until the player selects Mic mode. When the player switches back to Manual mode, the system SHALL close the input.

#### Scenario: Manual mode never touches the mic
- **WHEN** the player uses the app only in Manual mode
- **THEN** no microphone permission prompt appears and no input is open

#### Scenario: Switching to Mic mode
- **WHEN** the player selects Mic mode for the first time
- **THEN** the browser asks for microphone permission, and once it is granted the input opens and the level meter is live

#### Scenario: Switching back to Manual
- **WHEN** the player is in Mic mode and selects Manual mode
- **THEN** the input is closed and the browser no longer shows the microphone as in use

### Requirement: Permission denied or no input available
If microphone permission is denied or no input device exists, the system SHALL stay in Manual mode and tell the player why Mic mode is unavailable.

#### Scenario: Permission denied
- **WHEN** the player selects Mic mode and denies the permission prompt
- **THEN** the app stays in Manual mode and shows a message that microphone access is needed for Mic mode

### Requirement: Input device selection
In Mic mode the system SHALL list the available audio input devices by name and let the player choose one. The system SHALL use the browser's default input until the player chooses another.

#### Scenario: Choose an interface input
- **WHEN** the player's system exposes "Volt 2 In 1" and "Volt 2 In 2" and the player picks "Volt 2 In 2"
- **THEN** the level meter and detection use that input

### Requirement: Channel selection
For inputs with more than one channel, the system SHALL offer channel options Auto, 1 and 2. Auto SHALL use whichever channel currently has the stronger signal. Single-channel inputs SHALL not show the channel option.

#### Scenario: Two-channel interface
- **WHEN** the chosen device has 2 channels, the guitar is on channel 2, and the channel option is Auto
- **THEN** detection follows the guitar on channel 2 and ignores the quieter channel 1

#### Scenario: Fixed channel
- **WHEN** the player sets the channel option to 1
- **THEN** only channel 1 is used for level metering and detection

### Requirement: Raw capture
The system SHALL capture input with browser voice processing disabled (echo cancellation, noise suppression and automatic gain control off). It SHALL NOT route the input to the speakers.

#### Scenario: No playback of input
- **WHEN** Mic mode is active and the player strums
- **THEN** the app produces no audible output of the guitar signal

### Requirement: Level meter and strum indicator
In Mic mode, the setup screen SHALL show a live input level meter and an indicator that flashes each time a strum is detected, so the player can check the setup before starting.

#### Scenario: Test strum
- **WHEN** the player strums once on the setup screen in Mic mode
- **THEN** the level meter rises and the strum indicator flashes once

### Requirement: Sensitivity control
The system SHALL provide a sensitivity control. Higher sensitivity SHALL detect quieter strums, and lower sensitivity SHALL ignore more low-level noise.

#### Scenario: Raising sensitivity
- **WHEN** soft strums are not flashing the strum indicator and the player raises the sensitivity
- **THEN** the same soft strums flash the indicator

### Requirement: Remember input settings
The system SHALL remember the counting mode, chosen device, channel option and sensitivity across visits. If the remembered device is no longer present, the system SHALL fall back to the default input and say so.

#### Scenario: Return visit
- **WHEN** the player last used Mic mode with "Volt 2 In 2" and reopens the app
- **THEN** Mic mode is selected with "Volt 2 In 2", the same channel option and the same sensitivity

#### Scenario: Remembered device unplugged
- **WHEN** the remembered device is not connected when the app opens in Mic mode
- **THEN** the default input is used and the player is told the saved device was not found
