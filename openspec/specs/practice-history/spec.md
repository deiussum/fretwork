# practice-history Specification

## Purpose

Stores confirmed "1 minute changes" results locally so the player can see progress per chord pair, including personal bests and the previous score.

## Requirements

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

### Requirement: Personal best and previous score
The system SHALL compute, for each chord pair, the personal best (highest confirmed score) and the previous score (most recent confirmed score).

#### Scenario: Pair with history
- **WHEN** A↔D has results 28, 34, 31 in chronological order
- **THEN** the personal best is 34 and the previous score is 31

#### Scenario: Pair without history
- **WHEN** a pair has no results
- **THEN** the system shows no personal best and no previous score for it, rather than zero

### Requirement: History view
The system SHALL provide a history view listing every practised pair with its personal best, most recent score, number of attempts and date last practised. For each pair it SHALL list the individual results, newest first.

#### Scenario: View history
- **WHEN** the player opens the history view after practising A↔D and C↔G
- **THEN** both pairs are listed with their personal best, latest score, attempt count and last-practised date

### Requirement: Storage unavailable
The system SHALL keep working for timed sessions if browser storage is unavailable, and SHALL tell the player that results will not be saved.

#### Scenario: Storage blocked
- **WHEN** browser storage throws on access
- **THEN** sessions still run and the player sees a notice that results cannot be saved
