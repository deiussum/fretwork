## ADDED Requirements

### Requirement: Home link
The header SHALL show the logo and wordmark at the upper left, beside the tool switcher, wherever the tool switcher is shown and on the privacy page. Choosing it SHALL show the 1 minute changes setup screen. This applies from the metronome (which then stops), from the history view and from the privacy page, and 1 minute changes SHALL keep its selected pair. It SHALL be keyboard-operable as a link.

#### Scenario: From the metronome
- **WHEN** the metronome is playing and the player chooses the logo
- **THEN** the metronome stops and the 1 minute changes setup screen is shown

#### Scenario: From history
- **WHEN** the 1 minute changes history view is shown and the player chooses the logo
- **THEN** the setup screen is shown with the same pair selected

#### Scenario: Not during a session
- **WHEN** a 1 minute changes count-in or run is in progress
- **THEN** the logo link is not shown
