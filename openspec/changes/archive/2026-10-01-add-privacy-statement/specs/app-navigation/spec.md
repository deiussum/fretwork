## ADDED Requirements

### Requirement: Build version in the footer
The footer SHALL show the version of the running build next to the Privacy link: "v" followed by the release version, then the short commit id of the build when it is known. A development server SHALL show "dev". The version SHALL be fixed when the app is built, and showing it SHALL NOT need any network request.

#### Scenario: Release build
- **WHEN** version 0.1.0 is built from a git checkout at commit d933a13
- **THEN** the footer shows "v0.1.0 · d933a13"

#### Scenario: Built without git
- **WHEN** version 0.1.0 is built from a copy of the source that is not a git checkout
- **THEN** the footer shows "v0.1.0"

#### Scenario: Development server
- **WHEN** the app runs on the development server
- **THEN** the footer shows "dev"
