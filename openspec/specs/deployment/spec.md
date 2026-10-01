# deployment Specification

## Purpose

How a Fretwork instance is built and served, so that anyone can host their own copy as a container or on NixOS, with correct caching, security headers and privacy details for their setup.

## Requirements

### Requirement: Container image
The project SHALL publish a container image for amd64 and arm64. The image SHALL serve the built app over plain HTTP on port 8080 as a non-root user, and SHALL NOT handle TLS. Each release tag `v<x.y.z>` SHALL be published as `<x.y.z>`, `<x.y>` and `latest`.

#### Scenario: Run the image
- **WHEN** an operator runs the image with port 8080 published and opens it through an HTTPS proxy
- **THEN** the app loads and works, including Mic mode and the metronome

#### Scenario: Release tags
- **WHEN** the commit tagged `v0.2.0` is released
- **THEN** the image is available as `0.2.0`, `0.2` and `latest`

### Requirement: Caching
The server SHALL let browsers cache content-hashed files under `/assets/` for one year as immutable. It SHALL require browsers to revalidate `index.html` and `config.json` on every load, so a new deployment is picked up on the next visit.

#### Scenario: New deployment
- **WHEN** an instance is updated to a new version and a returning player reloads the page
- **THEN** the player gets the new version

### Requirement: Security headers
The server SHALL send:
- a Content-Security-Policy header with the same policy as the build, plus `frame-ancestors 'none'`
- `Permissions-Policy: microphone=(self)`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`

#### Scenario: Embedding blocked
- **WHEN** another site tries to show the app in a frame
- **THEN** the browser refuses to display it

### Requirement: No access logs by default
The container and the NixOS module SHALL NOT keep access logs by default. An operator SHALL be able to turn access logging on: the container then writes it to standard output, and the NixOS module uses nginx's normal access log.

#### Scenario: Default container
- **WHEN** the image runs without access logging turned on and a page is requested
- **THEN** no access log entry is written

### Requirement: Operator configuration
An operator SHALL be able to state the access log retention of their whole setup and an optional contact. The container takes these from `FRETWORK_LOG_RETENTION` and `FRETWORK_OPERATOR_CONTACT`; the NixOS module takes them from its options. The server SHALL serve them as `/config.json`, omitting fields that are not set. Values SHALL be encoded so that any text, including quotes, produces valid JSON.

When the app starts, it SHALL read `/config.json` from its own site. A missing or invalid file, or a field that is not a string, SHALL be treated as not set.

#### Scenario: Retention set
- **WHEN** the container runs with `FRETWORK_LOG_RETENTION="up to 7 days"`
- **THEN** `/config.json` contains `"logRetention": "up to 7 days"` and the privacy page states it

#### Scenario: Nothing set
- **WHEN** the app is served without a `config.json`
- **THEN** the app works normally and treats both details as not set

### Requirement: NixOS module
The project's Nix flake SHALL provide a NixOS module, `services.fretwork`, with these options:
- `enable`
- `hostName`
- `logRetention`
- `operatorContact`
- `accessLog`, which defaults to off

When enabled, it SHALL serve the packaged app through the system nginx on the given host name, with the same caching, security headers and `/config.json` as the container. TLS settings for that virtual host SHALL be left to the operator's nginx configuration.

#### Scenario: Enable the module
- **WHEN** a NixOS system enables `services.fretwork` with `hostName = "fretwork.example.com"` and `logRetention = "up to 7 days"`
- **THEN** nginx serves the app on that host, with the security headers, and `/config.json` states the retention

### Requirement: Build version outside git
Builds made without a git checkout SHALL take the commit hash from the `FRETWORK_COMMIT` variable when it is set. The container and Nix builds SHALL set it, so their footer shows `v<version> · <hash>`.

#### Scenario: Container build
- **WHEN** the image for `v0.2.0` is built in CI from commit 1a2b3c4
- **THEN** the app's footer shows "v0.2.0 · 1a2b3c4"
