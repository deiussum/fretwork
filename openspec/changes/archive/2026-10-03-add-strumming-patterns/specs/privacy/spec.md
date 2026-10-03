## MODIFIED Requirements

### Requirement: Privacy page
Choosing the Privacy link SHALL show a privacy statement in place of the current tool. The statement SHALL cover:
- **Accounts and storage:** there are no accounts and nothing is stored on a server.
- **No outside requests:** the app makes no requests to other sites.
- **Microphone:** it is used only in Mic mode and only after the browser asks for permission. Audio is analysed in the browser and never leaves it, and only strum times are saved, never audio.
- **Session recordings:** they are off by default, kept in memory only until the next session or page reload, and downloads are saved directly to the player's computer.
- **Saved in the browser:** results, settings, the strumming patterns the player made and the chosen input device's ID are saved in the browser, and clearing the site's data deletes them.
- **Access logs:** the servers that host and serve this instance may keep standard access logs (IP address, time and files requested). The statement SHALL give the retention the site's operator configured. When none is configured, it SHALL say the operator has not stated it.
- **Operator contact:** when the operator configured one, the statement SHALL show it. It SHALL be a link only when it starts with `https://` or `mailto:`, and plain text otherwise.
- **Questions:** a link to the project on GitHub.
- **Last updated:** the date the statement last changed.

#### Scenario: Open the statement
- **WHEN** the player chooses the Privacy link on the metronome screen
- **THEN** the privacy statement is shown, including the date it was last updated and a link to the GitHub project

#### Scenario: Custom patterns listed
- **WHEN** the player opens the privacy statement
- **THEN** the list of what is saved in the browser includes the strumming patterns they made

#### Scenario: Operator retention shown
- **WHEN** the operator configured the log retention as "up to 7 days"
- **THEN** the statement says access logs are kept for up to 7 days

#### Scenario: Retention not stated
- **WHEN** no log retention is configured
- **THEN** the statement says this site's operator has not stated how long access logs are kept

#### Scenario: Operator contact
- **WHEN** the operator configured the contact "mailto:admin@example.com"
- **THEN** the statement shows it as a link; a contact of "Ask in the #music channel" is shown as plain text

### Requirement: Privacy link
The system SHALL show a footer with a "Privacy" link wherever the tool switcher is shown. It SHALL NOT be shown during a 1 minute changes count-in, run, score confirmation or result, or while the strumming pattern editor is open.

#### Scenario: Footer on setup
- **WHEN** the 1 minute changes setup screen is shown
- **THEN** a "Privacy" link is shown in the footer

#### Scenario: No footer mid-session
- **WHEN** a 1 minute changes count-in or run is in progress
- **THEN** no footer is shown

### Requirement: Only the app's own site
The app SHALL NOT load from, or send data to, any site other than the one it was served from. The production build SHALL enforce this with a Content-Security-Policy that allows the following only from the app's own site, or not at all:
- scripts, workers and audio worklets
- styles and images
- network connections

Plugins, form submissions and changing the page's base URL SHALL be disallowed. Every feature SHALL keep working under this policy, including Mic mode, the metronome, the strumming tool and recording downloads.

#### Scenario: Blocked outside request
- **WHEN** code in the production build tries to fetch a URL on another site
- **THEN** the browser blocks the request

#### Scenario: Features work under the policy
- **WHEN** the production build is used for a Mic mode session, a metronome run, a strumming pattern run and a recording download
- **THEN** each works as it does without the policy, and the browser reports no policy violations
