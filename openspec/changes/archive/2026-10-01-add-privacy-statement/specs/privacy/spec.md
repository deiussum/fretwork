## Purpose

Tells players plainly what Fretwork does with their data, and makes sure the app keeps to it. The app talks only to the site it was loaded from, and the production build enforces that.

## ADDED Requirements

### Requirement: Privacy link
The system SHALL show a footer with a "Privacy" link wherever the tool switcher is shown. It SHALL NOT be shown during a 1 minute changes count-in, run, score confirmation or result.

#### Scenario: Footer on setup
- **WHEN** the 1 minute changes setup screen is shown
- **THEN** a "Privacy" link is shown in the footer

#### Scenario: No footer mid-session
- **WHEN** a 1 minute changes count-in or run is in progress
- **THEN** no footer is shown

### Requirement: Privacy page
Choosing the Privacy link SHALL show a privacy statement in place of the current tool. The statement SHALL cover:
- **Accounts and storage:** there are no accounts and nothing is stored on a server.
- **No outside requests:** the app makes no requests to other sites.
- **Microphone:** it is used only in Mic mode and only after the browser asks for permission. Audio is analysed in the browser and never leaves it, and only strum times are saved, never audio.
- **Session recordings:** they are off by default, kept in memory only until the next session or page reload, and downloads are saved directly to the player's computer.
- **Saved in the browser:** results, settings and the chosen input device's ID are saved in the browser, and clearing the site's data deletes them.
- **Access logs:** the servers that host and serve the app keep standard access logs (IP address, time and files requested), and the statement gives the longest period any of them keeps them.
- **Questions:** a link to the project on GitHub.
- **Last updated:** the date the statement last changed.

#### Scenario: Open the statement
- **WHEN** the player chooses the Privacy link on the metronome screen
- **THEN** the privacy statement is shown, including the date it was last updated and a link to the GitHub project

### Requirement: Leaving the privacy page
Escape and a Back control on the privacy page SHALL return to the tool that was shown before. 1 minute changes SHALL keep its selected pair and view. While the privacy page is shown, other tools' keyboard shortcuts SHALL NOT apply.

#### Scenario: Back to 1 minute changes
- **WHEN** the player has typed a pair E↔G, opened the privacy page, and presses Escape
- **THEN** the 1 minute changes setup screen is shown with E↔G selected

#### Scenario: Space on the privacy page
- **WHEN** the privacy page is shown and the player presses Space
- **THEN** no session or metronome starts

### Requirement: Only the app's own site
The app SHALL NOT load from, or send data to, any site other than the one it was served from. The production build SHALL enforce this with a Content-Security-Policy that allows the following only from the app's own site, or not at all:
- scripts, workers and audio worklets
- styles and images
- network connections

Plugins, form submissions and changing the page's base URL SHALL be disallowed. Every feature SHALL keep working under this policy, including Mic mode, the metronome, and recording downloads.

#### Scenario: Blocked outside request
- **WHEN** code in the production build tries to fetch a URL on another site
- **THEN** the browser blocks the request

#### Scenario: Features work under the policy
- **WHEN** the production build is used for a Mic mode session, a metronome run and a recording download
- **THEN** each works as it does without the policy, and the browser reports no policy violations
