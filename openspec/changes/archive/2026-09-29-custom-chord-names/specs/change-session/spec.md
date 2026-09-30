## MODIFIED Requirements

### Requirement: Keyboard-driven control
The system SHALL let the player control a session without the mouse: Space starts a session, Escape aborts a session in progress, and Enter confirms the score. While a text field has focus, Space SHALL be typed into the field and SHALL NOT start a session. Pressing Enter in a chord field SHALL confirm the name and move focus out of the field, so that the next Space starts the session.

#### Scenario: Start with Space
- **WHEN** a valid chord pair is selected and the player presses Space on the setup screen
- **THEN** the count-in begins

#### Scenario: Space ignored while running
- **WHEN** a count-in or run is in progress and the player presses Space
- **THEN** the session continues unaffected

#### Scenario: Typing a space in a chord field
- **WHEN** a chord field has focus and the player presses Space
- **THEN** a space is typed into the field and no session starts

#### Scenario: Enter leaves the chord field
- **WHEN** the player types a valid chord name, presses Enter and then presses Space
- **THEN** the chord field loses focus on Enter, and the count-in begins on Space
