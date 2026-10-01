#!/usr/bin/env bash
# Smoke-test a Fretwork container image: headers, caching, operator config,
# access logging and the non-root user.
#
#   deploy/smoke-test.sh fretwork:dev
set -euo pipefail

image=${1:?usage: deploy/smoke-test.sh IMAGE}
port=${PORT:-18080}
name=fretwork-smoke-$$
base=http://localhost:$port

fail() {
  echo "FAIL: $*" >&2
  exit 1
}
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# Start the container with the given docker run options and wait until it serves.
start() {
  cleanup
  docker run -d --name "$name" -p "$port:8080" "$@" "$image" >/dev/null
  for _ in $(seq 1 50); do
    curl -sf "$base/" >/dev/null && return
    sleep 0.2
  done
  docker logs "$name" >&2 || true
  fail "container did not start serving"
}

headers() { curl -sfI "$base$1" | tr -d '\r' | tr '[:upper:]' '[:lower:]'; }
expect_header() { headers "$1" | grep -qF "$2" || fail "$1 is missing header: $2"; }
json() { python3 -c 'import json, sys; print(json.dumps(json.load(sys.stdin), sort_keys=True))'; }

echo "== operator config set, access log off (default)"
start -e 'FRETWORK_LOG_RETENTION=up to "7" days' -e 'FRETWORK_OPERATOR_CONTACT=mailto:admin@example.com'

asset=$(curl -sf "$base/" | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -n1)
[ -n "$asset" ] || fail "no asset found in index.html"

for path in / "$asset" /config.json; do
  expect_header "$path" "frame-ancestors 'none'"
  expect_header "$path" "permissions-policy: microphone=(self)"
  expect_header "$path" "x-content-type-options: nosniff"
  expect_header "$path" "referrer-policy: no-referrer"
done
expect_header "$asset" "immutable"
expect_header / "cache-control: no-cache"
expect_header /config.json "cache-control: no-cache"
expect_header /config.json "content-type: application/json"

config=$(curl -sf "$base/config.json" | json)
expected=$(echo '{"logRetention": "up to \"7\" days", "operatorContact": "mailto:admin@example.com"}' | json)
[ "$config" = "$expected" ] || fail "config.json was $config"

[ "$(docker exec "$name" id -u)" != 0 ] || fail "container runs as root"
if docker logs "$name" 2>&1 | grep -q '"GET /'; then fail "access log written with logging off"; fi

echo "== access log on"
start -e FRETWORK_ACCESS_LOG=on
curl -sf "$base/" >/dev/null
sleep 0.5
docker logs "$name" 2>&1 | grep -q '"GET / ' || fail "no access log with FRETWORK_ACCESS_LOG=on"

echo "== nothing configured"
start
config=$(curl -sf "$base/config.json" | json)
[ "$config" = "{}" ] || fail "config.json was $config, expected {}"

echo "smoke test passed"
