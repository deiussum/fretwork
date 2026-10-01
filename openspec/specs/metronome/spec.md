# metronome Specification

## Purpose

A standalone metronome for general practice. It plays a steady, accented click at a chosen tempo, and has a speed trainer that raises the tempo step by step towards a target. It is driven from the keyboard so the player's hands can stay on the guitar.

## Requirements

### Requirement: Steady click at a chosen tempo
The system SHALL play a click on every beat at the selected tempo, from 30 to 300 BPM in whole BPM. The default tempo SHALL be 100 BPM. The interval between consecutive clicks SHALL deviate by no more than 5 ms from 60 / BPM seconds, even while the UI is busy rendering.

#### Scenario: Click interval
- **WHEN** the metronome plays at 120 BPM
- **THEN** a click sounds every 0.5 seconds, each within 5 ms of its exact time

#### Scenario: Tempo limits
- **WHEN** the tempo is 300 BPM and the player tries to raise it
- **THEN** the tempo stays at 300 BPM

### Requirement: Start and stop
Space SHALL start the metronome when stopped and stop it when playing. Escape SHALL stop it when playing. The first click SHALL sound within 200 ms of starting and SHALL be the first beat of a bar. Stopping SHALL silence every click that has not yet sounded. The first start after the page loads SHALL make audio audible, so browser autoplay restrictions never silence it.

#### Scenario: Start
- **WHEN** the metronome is stopped and the player presses Space
- **THEN** an accented first beat sounds within 200 ms and clicks continue at the selected tempo

#### Scenario: Stop
- **WHEN** the metronome is playing and the player presses Space or Escape
- **THEN** no further clicks sound

### Requirement: Beats per bar and accent
The player SHALL be able to set the beats per bar from 1 to 12, with a default of 4. The first beat of each bar SHALL use an accent sound that is clearly different from the other beats. With 1 beat per bar, every click SHALL be the unaccented sound. A change to the beats per bar while playing SHALL take effect from the next bar.

#### Scenario: Accent in 3/4
- **WHEN** the beats per bar is 3 and the metronome plays
- **THEN** the clicks follow the pattern accent, click, click, accent, click, click…

#### Scenario: Change while playing
- **WHEN** the metronome plays 4 beats per bar and the player changes it to 3 on beat 2
- **THEN** the current bar finishes with 4 beats and the following bars have 3

### Requirement: Tempo change while playing
A tempo change while playing SHALL apply from the next click that has not yet been scheduled, without restarting the bar and without a gap or double click. It SHALL be audible within 150 ms.

#### Scenario: Speed up while playing
- **WHEN** the metronome plays at 100 BPM and the player raises the tempo to 110 BPM
- **THEN** the beat continues without interruption, and from the next click the interval is 60/110 s

### Requirement: Keyboard control
The metronome SHALL be fully usable from the keyboard:
- Space starts and stops.
- Escape stops.
- Arrow Up and Arrow Down change the tempo by 1 BPM, or by 5 BPM with Shift held.
- Arrow Left and Arrow Right change the beats per bar by 1.
- T taps the tempo.
- S turns the speed trainer on or off while stopped.

While a text or number field has focus, these shortcuts SHALL NOT apply, except that Enter SHALL confirm the field and move focus out of it, and Escape SHALL stop playback.

#### Scenario: Shift for larger steps
- **WHEN** the tempo is 100 BPM and the player presses Shift+Arrow Up
- **THEN** the tempo becomes 105 BPM

#### Scenario: Typing in a field
- **WHEN** the speed trainer target field has focus and the player presses Space or an arrow key
- **THEN** the field receives the key and the metronome does not start or change tempo

#### Scenario: Trainer toggle ignored while playing
- **WHEN** the metronome is playing and the player presses S
- **THEN** the speed trainer stays as it was

### Requirement: Tap tempo
Pressing T repeatedly SHALL set the tempo from the average interval between the most recent taps, using up to the last 4 intervals. The result SHALL be rounded to a whole BPM and clamped to 30–300. A gap of more than 2 seconds since the previous tap SHALL start a new measurement. A single tap SHALL NOT change the tempo. Tap tempo SHALL work whether the metronome is stopped or playing.

#### Scenario: Tap at 90 BPM
- **WHEN** the player presses T five times, 0.667 s apart
- **THEN** the tempo becomes 90 BPM

#### Scenario: Pause resets taps
- **WHEN** the player taps twice 0.5 s apart, waits 3 s, then taps twice 1 s apart
- **THEN** the tempo becomes 60 BPM

### Requirement: Visual beat indicator
While playing, the screen SHALL show one marker per beat in the bar and highlight the current beat. The accented beat SHALL be visually distinct. The highlight SHALL change within 50 ms of the matching click. The tempo and beat markers SHALL be readable from about 2 metres on a desktop monitor.

#### Scenario: Following the beat
- **WHEN** the metronome plays 4 beats per bar and the third click of a bar sounds
- **THEN** the third of four markers is highlighted

### Requirement: Speed trainer
The player SHALL be able to turn on a speed trainer with four settings: start tempo, step (BPM), every (bars) and target tempo. The defaults SHALL be 80, 5, 4 and 120.

When the metronome starts with the trainer on, bar *n* of the run (counting from 0) SHALL play at:

min(target, start + floor(n / every) × step)

The tempo therefore changes only at bar boundaries and holds at the target once reached. Stopping SHALL reset the trainer, so the next start begins again at the start tempo.

Valid settings are:
- start and target from 30 to 300, with target greater than start
- step from 1 to 50
- every from 1 to 64

The settings SHALL be editable only while stopped. With invalid settings, the metronome SHALL NOT start and SHALL say which setting is invalid.

#### Scenario: Ramp
- **WHEN** the trainer is set to start 95, step 5, every 4 bars, target 120, and the metronome plays
- **THEN** bars 0–3 play at 95 BPM, bars 4–7 at 100 BPM, and so on, and from bar 20 onwards every bar plays at 120 BPM

#### Scenario: Target not a whole number of steps away
- **WHEN** the trainer is set to start 100, step 15, every 1 bar, target 120
- **THEN** bar 0 plays at 100, bar 1 at 115, and bar 2 onwards at 120 BPM

#### Scenario: Restart after stop
- **WHEN** the trainer has reached 110 BPM and the player stops and starts again
- **THEN** the run begins at the start tempo

#### Scenario: Invalid settings
- **WHEN** the trainer target is lower than its start tempo and the player presses Space
- **THEN** the metronome does not start and the player is told the target must be above the start tempo

### Requirement: Tempo adjustment with the speed trainer on
With the speed trainer on, a tempo change from the arrow keys or tap tempo SHALL shift the start and target tempo by the same amount. The amount is the difference between the new tempo and the tempo currently shown. While playing, the bar count SHALL continue, and the current tempo SHALL follow the shifted ramp from the next unscheduled click. The shift SHALL be limited so that both start and target stay within 30–300.

#### Scenario: Slow down mid-ramp
- **WHEN** the trainer runs from 95 to 120 and is currently at 110 BPM, and the player presses Shift+Arrow Down
- **THEN** the current tempo becomes 105, the ramp now runs from 90 to 115, and later steps continue from 105 on the original bar schedule

#### Scenario: Shift limited at the top
- **WHEN** the trainer runs from 260 to 298 and the player presses Shift+Arrow Up
- **THEN** start and target rise by 2, to 262 and 300

### Requirement: Speed trainer progress
While the speed trainer is playing, the screen SHALL show:
- the current tempo
- the start and target tempo
- the number of bars until the next tempo step, or that the target has been reached

The tempo display SHALL briefly highlight each time the tempo steps up.

#### Scenario: Progress shown
- **WHEN** the trainer steps every 4 bars and the metronome is playing bar 6 of the run (counting from 0), two bars after the step at bar 4
- **THEN** the screen shows that the next step is in 2 bars

#### Scenario: Target reached
- **WHEN** the ramp has reached its target tempo
- **THEN** the screen indicates that the target has been reached and no next step is shown

### Requirement: Background timing
The metronome SHALL keep accurate time while the browser tab is hidden or another tab is in front, for at least 10 minutes. The same 5 ms interval tolerance SHALL apply, with no missed or bunched clicks, and the speed trainer SHALL continue to step on schedule.

#### Scenario: Switch tabs while playing
- **WHEN** the metronome plays at 120 BPM and the player switches to another browser tab for 10 minutes
- **THEN** clicks continue every 0.5 s within tolerance throughout, with no gaps

### Requirement: Remembered settings
The system SHALL remember the following between visits:
- tempo
- beats per bar
- whether the speed trainer is on
- the speed trainer's four settings

Stored values that are missing or invalid SHALL fall back to their defaults. If browser storage is unavailable, the metronome SHALL still work with settings that last for the current page only.

#### Scenario: Return later
- **WHEN** the player sets 3 beats per bar at 72 BPM, closes the page and opens it again
- **THEN** the metronome shows 72 BPM and 3 beats per bar

#### Scenario: Storage unavailable
- **WHEN** browser storage throws on access
- **THEN** the metronome still starts, stops and changes tempo normally
