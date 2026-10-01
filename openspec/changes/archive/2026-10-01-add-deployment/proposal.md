## Why

Fretwork is ready to be hosted: on the author's NixOS server for now, and by anyone else who wants their own copy. Today there is no packaged way to deploy it. The privacy page also has the author's log retention compiled in, so any other instance would show visitors the wrong information.

## What Changes

- **Container image:** a published image (`ghcr.io/deiussum/fretwork`, amd64 and arm64) that serves the built app over plain HTTP from an unprivileged nginx, for use behind a TLS proxy. It sends the caching and security headers itself, and keeps no access logs by default. Operators set its privacy details with environment variables.
- **Nix flake:**
  - a package containing the built app
  - a NixOS module (`services.fretwork`) that serves it through the system nginx, with the same headers and the same privacy options
  - a development shell
  - checks, including a NixOS VM test of the module
- **Operator-supplied privacy details:** the app reads an optional `/config.json` from its own site at startup.
  - The privacy page shows the operator's access log retention and an optional operator contact.
  - It says the retention is not stated when no config is provided.
  - The compiled-in log retention is removed.
- **Build version from outside git:** the build takes the commit hash from a `FRETWORK_COMMIT` variable when there is no git checkout, so the Docker and Nix builds still show `v<version> · <hash>`.
- **GitHub Actions:**
  - every pull request and push to `main` runs the tests, lint, build and `nix flake check`
  - each `v*` tag publishes the image as `:<version>`, `:<major>.<minor>` and `:latest`
- **Docs:** a self-hosting section in the README covering the container, the NixOS module, the HTTPS requirement and the privacy settings.
- **Not included:**
  - TLS handling inside the container
  - Kubernetes manifests
  - a Nix-built container image (the Dockerfile is the one image)
  - any change to how the app behaves for players

## Capabilities

### New Capabilities
- `deployment`: how a Fretwork instance is served, covering:
  - the container image's port, headers and caching
  - access logging off by default
  - configuration through environment variables
  - the NixOS module's options and behaviour
  - the operator configuration file the app reads

### Modified Capabilities
- `privacy`: the statement shows the operator's stated access log retention, or says it is not stated, plus an optional operator contact, rather than a value compiled into the app.

## Impact

- **New files:**
  - `Dockerfile`, `.dockerignore`, `deploy/nginx.conf` and a container entrypoint script that writes `config.json`
  - `flake.nix` and `flake.lock`, plus `nix/module.nix` and `nix/test.nix`
  - `.github/workflows/ci.yml` and `.github/workflows/release.yml`
- **Existing files:**
  - `vite.config.ts`: reads `FRETWORK_COMMIT`
  - `src/`: a small operator-config loader, and `PrivacyView` reads from it
  - `README.md` and `CONTRIBUTING.md`: self-hosting and release docs
- **External:** images are published to GitHub Container Registry under the repository owner.
