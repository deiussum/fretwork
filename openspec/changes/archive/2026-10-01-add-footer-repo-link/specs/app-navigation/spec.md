## ADDED Requirements

### Requirement: Project link in the footer
The footer SHALL include a "GitHub" link to the project's source code, next to the Privacy link and the build version. It SHALL open in a new tab without giving the new page access to the app (`noopener`), and SHALL point to the same project URL as the privacy page's questions link.

#### Scenario: Open the project
- **WHEN** the player chooses "GitHub" in the footer
- **THEN** the project's repository opens in a new tab and the app stays as it was

#### Scenario: Same link as the privacy page
- **WHEN** the footer link and the privacy page's GitHub link are compared
- **THEN** both point to the same URL
