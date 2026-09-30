## MODIFIED Requirements

### Requirement: Built-in chord list
The system SHALL provide a built-in list of common chords, offered as suggestions for both chord slots. The list SHALL contain at least: A, Am, A7, Asus2, Asus4, B, Bm, B7, C, Cadd9, C7, D, Dm, D7, Dsus2, Dsus4, E, Em, Em7, E7, F, Fmaj7, G, G/B, G7. The built-in list SHALL NOT limit which chords can be selected (see "Custom chord names").

#### Scenario: Chord list available
- **WHEN** the player opens chord pair selection
- **THEN** every chord in the built-in list is suggested for both chord slots

#### Scenario: Suggestions filter as the player types
- **WHEN** the player types "Ds" into a chord slot
- **THEN** Dsus2 and Dsus4 are among the suggestions offered

## ADDED Requirements

### Requirement: Custom chord names
The system SHALL let the player enter any chord name into either chord slot by typing it, including names not in the built-in list. A custom chord SHALL be treated like a built-in chord for sessions, history and personal bests.

#### Scenario: Slash chord entered
- **WHEN** the player types "D/F#" into the first slot and selects G for the second
- **THEN** the pair D/F# ↔ G is shown as the current pair and starting a session is enabled

#### Scenario: Custom pair remembered
- **WHEN** the player last practised Amadd9 ↔ C and reopens the app
- **THEN** Amadd9 ↔ C is preselected as the current pair

### Requirement: Chord name rules
The system SHALL remove leading and trailing whitespace from a chord name and collapse runs of inner whitespace to a single space. It SHALL keep letter case as entered, so names that differ only in case are different chords. The system SHALL reject a chord name that is empty, contains the character `|`, or is longer than 12 characters after cleanup. Starting a session SHALL be disabled while either slot holds a rejected name, and the player SHALL be told why.

#### Scenario: Whitespace ignored
- **WHEN** the player has results for Am ↔ D and enters " Am " in the first slot and D in the second
- **THEN** the system shows the personal best and history for Am ↔ D

#### Scenario: Case is significant
- **WHEN** the player has results for Am7 ↔ D and enters AM7 and D
- **THEN** the system treats AM7 ↔ D as a different pair with no history

#### Scenario: Name too long
- **WHEN** the player enters a 13-character chord name
- **THEN** starting a session is disabled and the player is told the name is too long

#### Scenario: Forbidden character
- **WHEN** the player enters "A|B" as a chord name
- **THEN** starting a session is disabled and the player is told the name contains a character that isn't allowed

#### Scenario: Empty slot
- **WHEN** the player clears a chord slot
- **THEN** starting a session is disabled and the player is told to enter a chord

### Requirement: Suggest previously practised chords
The system SHALL add every chord name that appears in saved results to the suggestions for both chord slots, alongside the built-in list, without duplicates.

#### Scenario: Custom chord suggested after use
- **WHEN** the player has saved a result for D/F# ↔ G
- **THEN** D/F# is suggested in both chord slots

#### Scenario: No duplicate suggestions
- **WHEN** the player has saved results for G ↔ C
- **THEN** G and C each appear once in the suggestions
