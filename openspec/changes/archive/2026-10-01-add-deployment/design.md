## Context

See proposal.md for the motivation and specs/ for the behaviour.

`npm run build` produces a fully static `dist/`:
- `index.html`, which carries the CSP meta tag
- hashed JS and CSS
- the metronome worker and the strum worklet
- the favicon

`vite.config.ts` gets the commit hash from `git rev-parse`, which fails inside Docker and Nix builds. `PrivacyView.tsx` has `LOG_RETENTION` compiled in. The production CSP comes from `buildCsp()` in `src/csp.ts`.

The author's instance will run on NixOS (Roguex) through the NixOS module, behind Pangolin, which keeps request logs for 7 days.

## Goals / Non-Goals

**Goals:**
- One source for each piece of policy: the CSP, the security headers and the caching rules are shared by the container and the NixOS module.
- One container image works for any operator without rebuilding.
- The Nix build needs no hand-maintained dependency hash.

**Non-Goals:**
- TLS inside the container or the module (operators terminate TLS in their proxy or nginx).
- Building the container image with Nix.
- Kubernetes or Helm.
- Automatic updates.

## Decisions

### 1. Operator details come from a runtime `/config.json`

The app fetches `/config.json` once at startup with `cache: 'no-cache'`, without blocking the first render. `src/domain/operatorConfig.ts` validates it: an object whose `logRetention` and `operatorContact` are each a string or absent. Anything else is treated as not set.

The shell keeps the result in state and passes it to `PrivacyView`. `LOG_RETENTION` is removed, and `PRIVACY_UPDATED` is bumped because the wording changes.

The CSP already allows `connect-src 'self'`, and the privacy statement already says the app only loads its own files, so this stays within the existing promise.

**Alternatives considered:**
- Build arguments: operators would have to build their own image.
- An inline script injected at startup: the CSP forbids it.
- `config.js` loaded with a `<script>` tag: it works under `'self'`, but it executes code where we only need data.

### 2. Container: build once, serve with unprivileged nginx

The `Dockerfile` has two stages:
- **Build:** `FROM --platform=$BUILDPLATFORM node:22-alpine`. It runs `npm ci && npm run build` with `ARG FRETWORK_COMMIT`, then generates the nginx header snippet (decision 4). The output is platform-independent, so it is built once on the native platform rather than under QEMU for arm64.
- **Serve:** `nginxinc/nginx-unprivileged:alpine`. It listens on 8080 as a non-root user, with `jq` installed at build time. It copies `dist/` to `/usr/share/nginx/html`, plus `deploy/nginx.conf` and the generated header snippet.

`.dockerignore` excludes `node_modules`, `dist` and `.git`. The commit therefore always arrives through `FRETWORK_COMMIT`.

### 3. Container start-up writes config and logging into `/tmp`

A script in `/docker-entrypoint.d/` (which the nginx image runs before starting) writes two files:
- `/tmp/fretwork/config.json`, built with `jq -n --arg …` so any operator text is correctly escaped, leaving out unset fields
- `/tmp/fretwork/access-log.conf`, which contains `access_log off;`, or `access_log /dev/stdout;` when `FRETWORK_ACCESS_LOG=on`

`nginx.conf` serves `location = /config.json { alias /tmp/fretwork/config.json; }` and `include`s the logging file. Writing only to `/tmp` keeps the web root read-only and works with a read-only root filesystem.

### 4. Headers and caching generated from the same source as the CSP

`scripts/nginx-headers.ts` (run with `tsx`) prints an nginx snippet of `add_header … always;` lines:
- the CSP from `buildCsp()` plus `frame-ancestors 'none'`
- `Permissions-Policy: microphone=(self)`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`

The container build and the Nix package both generate it. A unit test checks that the header policy is exactly `buildCsp()` plus `frame-ancestors`, so the header and the meta tag can't drift apart.

nginx drops server-level `add_header` lines in any location that has its own `add_header`. So every location block `include`s the snippet, next to its own `Cache-Control`:
- `/assets/`: `public, max-age=31536000, immutable`
- `= /index.html`, `= /` and `= /config.json`: `no-cache`
- everything else: default

### 5. `FRETWORK_COMMIT` takes precedence over git

`vite.config.ts` uses `process.env.FRETWORK_COMMIT`, cut to 7 characters, when it is set, and otherwise falls back to `git rev-parse`. Both CI and Nix set it explicitly, so it should win. Local builds keep working unchanged.

### 6. Nix flake

`flake.nix` uses nixpkgs `nixos-unstable` and supports `x86_64-linux` and `aarch64-linux`. It provides:
- **`packages.default`:** `buildNpmPackage` with `npmDeps = importNpmLock { npmRoot = ./.; }` and `npmConfigHook = importNpmLock.npmConfigHook`, so `package-lock.json` is the only lock and there is no `npmDepsHash`. It sets `FRETWORK_COMMIT = self.shortRev or self.dirtyShortRev`. It installs `dist/` to `$out/share/fretwork/www` and the header snippet to `$out/share/fretwork/nginx-headers.conf`.
- **`nixosModules.default`** (`nix/module.nix`): `services.fretwork` with the options in the spec. It sets:
  - `services.nginx.enable`
  - `virtualHosts.${hostName}`, with `root` set to the package's `www` and the same location and caching rules as decision 4, including the shared snippet
  - `location = /config.json`, which serves `pkgs.writeText` of `builtins.toJSON`, with null options filtered out
  - `access_log off;` unless `accessLog` is true

  The operator adds TLS (`forceSSL`, `enableACME` and so on) on the same virtual host in their own configuration, because NixOS merges the definitions.
- **`checks`:** the package build, plus `nix/test.nix`, a `nixosTest` that enables the module and uses `curl` to check `index.html`, the headers, `config.json` and that no access log entry is written.
- **`devShells.default`:** `nodejs_22`, with `openspec` too if nixpkgs packages it.

**Alternative considered:** `npmDepsHash` with a CI job to refresh it. That's more friction for every dependency bump.

### 7. GitHub Actions

- **`ci.yml`:** runs on pull requests and on pushes to `main`. Two jobs:
  - **node:** `npm ci`, test, lint, build
  - **nix:** install Nix and run `nix flake check`, with KVM enabled for the VM test
- **`release.yml`:** runs on `v*` tags, with `packages: write` permission. It:
  1. fails unless the tag equals `v` plus the `package.json` version
  2. sets up QEMU and Buildx, and logs in to GitHub's container registry with `GITHUB_TOKEN`
  3. uses `docker/metadata-action` with semver patterns for `{{version}}`, `{{major}}.{{minor}}` and `latest`
  4. builds and pushes `linux/amd64,linux/arm64` with `FRETWORK_COMMIT=${{ github.sha }}`

Images are published as `ghcr.io/<owner>/fretwork`.

## Risks / Trade-offs

- **[Risk]** `importNpmLock` may not handle Vite's native optional dependencies (the Rolldown platform bindings). → An early task builds the flake first. If it fails, fall back to `npmDepsHash` and record that here.
- **[Risk]** The NixOS VM test needs KVM on GitHub runners. → Enable KVM in the workflow. If that proves unreliable, run the VM test only on `main` and tags, and record that here.
- **[Risk]** Two serving configurations (the container's `nginx.conf` and the Nix module) could drift. → They share the generated header snippet. Caching rules are duplicated but small, and both are covered by checks: the VM test for the module and a container smoke test for the image.
- **[Trade-off]** The page shows "not stated" until `config.json` loads or when it's missing. That is honest, and the file loads quickly from the same site.
- **[Risk]** A forked instance's footer links to the upstream GitHub project. → This is intended, since questions about the software go upstream. Operators use `operatorContact` for questions about their instance.

## Migration Plan

1. Merge, then tag `v0.2.0`, which publishes the first image.
2. On Roguex, add the flake input and enable `services.fretwork` with `logRetention = "up to 7 days"` and `hostName = "fretwork.deiussum.com"`, and point Pangolin at that nginx virtual host.
3. To roll back, pin the flake input to the previous tag.
