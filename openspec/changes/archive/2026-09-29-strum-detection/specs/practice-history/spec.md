## MODIFIED Requirements

### Requirement: Persist results locally
The system SHALL store each confirmed result in the browser, and results SHALL survive page reloads. Each result SHALL record the chord pair, the confirmed score, the run duration in seconds, the date and time, and the counting method (`manual` or `mic`). Results from Mic mode SHALL also record the detected count and the time of each counted strum in seconds after the "go" sound. Results saved before this change SHALL remain readable.

#### Scenario: Result survives reload
- **WHEN** the player saves a score of 34 for A↔D and reloads the page
- **THEN** the A↔D history still contains the 34 result with its date and time

#### Scenario: Manual method recorded
- **WHEN** the player types and confirms a score without automatic detection
- **THEN** the stored result has method `manual` and no detected count

#### Scenario: Mic method recorded
- **WHEN** a Mic mode run detects 36 strums and the player corrects the score to 34 and confirms
- **THEN** the stored result has method `mic`, score 34, detected count 36, and 36 strum times

#### Scenario: Older results still load
- **WHEN** the history contains manual results saved before this change
- **THEN** they load and display as before
