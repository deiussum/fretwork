#!/bin/sh
# Runs before nginx starts (nginx image entrypoint). Writes the operator config
# served as /config.json and the access-log setting. Only /tmp is written, so
# the container also works with a read-only root filesystem.
set -eu

dir=/tmp/fretwork
mkdir -p "$dir"

jq -n \
  --arg logRetention "${FRETWORK_LOG_RETENTION:-}" \
  --arg operatorContact "${FRETWORK_OPERATOR_CONTACT:-}" \
  '{logRetention: $logRetention, operatorContact: $operatorContact} | with_entries(select(.value != ""))' \
  > "$dir/config.json"

case "${FRETWORK_ACCESS_LOG:-off}" in
  on | true | 1) echo 'access_log /dev/stdout main;' ;;
  *) echo 'access_log off;' ;;
esac > "$dir/access-log.conf"
