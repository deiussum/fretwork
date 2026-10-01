## 1. Shared build pieces

- [x] 1.1 Make `vite.config.ts` use `FRETWORK_COMMIT` (first 7 characters) when set, before trying git. Verify that `FRETWORK_COMMIT=1a2b3c4d5e npm run build` gives a bundle containing `v<version> · 1a2b3c4` and that a plain `npm run build` still uses the git hash.
- [x] 1.2 Add `scripts/nginx-headers.ts`, which prints the nginx `add_header … always;` snippet: the CSP from `buildCsp()` plus `frame-ancestors 'none'`, `Permissions-Policy`, `X-Content-Type-Options` and `Referrer-Policy`. Verify with a unit test that the CSP header equals `buildCsp()` plus `; frame-ancestors 'none'` and that all four headers are present.

## 2. Operator configuration in the app

- [x] 2.1 Add `src/domain/operatorConfig.ts`: a loader that fetches `/config.json` with `cache: 'no-cache'` and validates it (string fields only, anything else not set, network or JSON errors not set). Verify with unit tests: a valid file, a missing file (404), invalid JSON, non-string fields, and extra fields ignored.
- [x] 2.2 Load the config once in the shell without blocking the first render, and pass it to `PrivacyView`. Remove `LOG_RETENTION`, update the access-log wording, show the operator contact (a link only for `https://` and `mailto:`), and bump `PRIVACY_UPDATED`. Verify with jsdom tests for the four privacy scenarios: retention shown, not stated, a `mailto:` contact as a link, and a plain-text contact.

## 3. Container image

- [x] 3.1 Add the `Dockerfile` (two stages: build on the build platform, serve with `nginx-unprivileged`), `.dockerignore`, `deploy/nginx.conf` (locations, caching, header include in each location, `config.json` alias, access-log include) and `deploy/40-fretwork-config.sh` (writes `config.json` with `jq` and `access-log.conf`). Verify that `docker build --build-arg FRETWORK_COMMIT=$(git rev-parse HEAD)` succeeds, or `podman build` if Docker isn't available.
- [x] 3.2 Smoke-test the image. Run it with `FRETWORK_LOG_RETENTION='up to "7" days'` and `FRETWORK_OPERATOR_CONTACT`, and check with `curl`:
  - all four security headers are on `/`, `/assets/*` and `/config.json`
  - `/assets/*` is immutable, and `/` and `/config.json` are `no-cache`
  - `/config.json` is valid JSON containing the quoted text
  - the container log has no access entries; with `FRETWORK_ACCESS_LOG=on` it does
  - it runs as a non-root user

  Add this as `deploy/smoke-test.sh` so CI can reuse it.
- [x] 3.3 Check the container in Chrome through `localhost` (a secure context): the footer shows the version and hash, the privacy page shows the configured retention and contact, the metronome plays, Mic mode opens, and there are no CSP violations. Remove test data from `localStorage` afterwards.

## 4. Nix flake

- [x] 4.1 Add `flake.nix` and `flake.lock`, with `packages.default` built using `importNpmLock` and `FRETWORK_COMMIT` from `self.shortRev`/`dirtyShortRev`, installing `www/` and `nginx-headers.conf`. Also add `devShells.default`. Verify that `nix build` succeeds, the output contains `www/index.html` and the header snippet, and the bundle shows the flake's short revision. If `importNpmLock` fails, switch to `npmDepsHash` and update design.md.
- [x] 4.2 Add `nix/module.nix` (`services.fretwork` with `enable`, `hostName`, `logRetention`, `operatorContact`, `accessLog`) and expose it as `nixosModules.default`. Verify with the VM test in 4.3.
- [x] 4.3 Add `nix/test.nix`, a `nixosTest` that enables the module with a retention and a contact and uses `curl` to check `index.html`, the headers, the caching, `config.json`, and that the access log is empty by default. Wire it into `checks`. Verify that `nix flake check` passes locally.

## 5. GitHub Actions

- [x] 5.1 Add `.github/workflows/ci.yml`: a node job (npm ci, test, lint, build) and a nix job (install Nix, enable KVM, `nix flake check`), plus the container smoke test. Verify by pushing the branch and seeing all jobs pass on the PR.
- [x] 5.2 Add `.github/workflows/release.yml`: on `v*` tags, check the tag matches `package.json`, set up QEMU and Buildx, log in to GitHub's container registry, apply semver tags with `docker/metadata-action`, and build and push amd64 and arm64 with `FRETWORK_COMMIT`. Verify with `actionlint` if available, otherwise by review. The real run happens at the first release (6.2).

## 6. Docs and release

- [x] 6.1 Add a Self-hosting section to the README:
  - the container (`docker run`/compose example, port 8080, HTTPS proxy required, environment variables)
  - the NixOS module (flake input, options, adding TLS on the virtual host)
  - `nix develop`

  Update CONTRIBUTING.md Releases: pushing a `v*` tag publishes the image. Verify the examples match the actual variable and option names.
- [x] 6.3 Verify that `npm test`, `npm run lint`, `npm run build`, `nix flake check` and `openspec validate add-deployment --strict` all pass.

After merging (author): tag `v0.2.0`, check that the release workflow publishes `ghcr.io/deiussum/fretwork:0.2.0`, and switch Roguex to `services.fretwork` with `logRetention = "up to 7 days"`. Verify that `https://fretwork.deiussum.com` shows the new footer version and the privacy page states 7 days.
