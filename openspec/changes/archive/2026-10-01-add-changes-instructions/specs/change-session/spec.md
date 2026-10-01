## ADDED Requirements

### Requirement: Instructions on the setup screen
The 1 minute changes setup screen SHALL offer a collapsible "How it works" section. It SHALL explain:
- choosing two chords that are awkward to change between
- starting with Space, the four count-in clicks and the "go" sound
- strumming each chord once and alternating until the end sound
- the counting rule: every strum counts, including the first, and Mic mode counts them automatically
- that the best and latest scores for each pair are kept in History

It SHALL credit the exercise as popularised by JustinGuitar, with a link that opens in a new tab.

The section SHALL be open the first time the setup screen is shown. After that, whether it is open SHALL be remembered between visits; if browser storage is unavailable, it applies for the current page only. When its toggle has keyboard focus, Space SHALL open or close it and SHALL NOT start a session.

#### Scenario: First visit
- **WHEN** a player opens the app for the first time
- **THEN** the setup screen shows the "How it works" instructions expanded

#### Scenario: Closed stays closed
- **WHEN** the player closes "How it works" and reloads the page
- **THEN** the instructions are shown collapsed

#### Scenario: Space on the toggle
- **WHEN** the "How it works" toggle has keyboard focus and the player presses Space
- **THEN** the section opens or closes and no count-in starts

#### Scenario: Counting rule matches the score
- **WHEN** the instructions are open
- **THEN** they state that the score is every strum played, including the first, matching the score confirmation screen
