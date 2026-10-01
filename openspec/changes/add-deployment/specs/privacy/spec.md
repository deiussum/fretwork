## MODIFIED Requirements

### Requirement: Privacy page
Choosing the Privacy link SHALL show a privacy statement in place of the current tool. The statement SHALL cover:
- **Accounts and storage:** there are no accounts and nothing is stored on a server.
- **No outside requests:** the app makes no requests to other sites.
- **Microphone:** it is used only in Mic mode and only after the browser asks for permission. Audio is analysed in the browser and never leaves it, and only strum times are saved, never audio.
- **Session recordings:** they are off by default, kept in memory only until the next session or page reload, and downloads are saved directly to the player's computer.
- **Saved in the browser:** results, settings and the chosen input device's ID are saved in the browser, and clearing the site's data deletes them.
- **Access logs:** the servers that host and serve this instance may keep standard access logs (IP address, time and files requested). The statement SHALL give the retention the site's operator configured. When none is configured, it SHALL say the operator has not stated it.
- **Operator contact:** when the operator configured one, the statement SHALL show it. It SHALL be a link only when it starts with `https://` or `mailto:`, and plain text otherwise.
- **Questions:** a link to the project on GitHub.
- **Last updated:** the date the statement last changed.

#### Scenario: Open the statement
- **WHEN** the player chooses the Privacy link on the metronome screen
- **THEN** the privacy statement is shown, including the date it was last updated and a link to the GitHub project

#### Scenario: Operator retention shown
- **WHEN** the operator configured the log retention as "up to 7 days"
- **THEN** the statement says access logs are kept for up to 7 days

#### Scenario: Retention not stated
- **WHEN** no log retention is configured
- **THEN** the statement says this site's operator has not stated how long access logs are kept

#### Scenario: Operator contact
- **WHEN** the operator configured the contact "mailto:admin@example.com"
- **THEN** the statement shows it as a link; a contact of "Ask in the #music channel" is shown as plain text
