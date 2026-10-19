#!/usr/bin/env bash
# Linux Docker host. Run only for an approved release; no DB migrations/provider refreshes.
set -Eeuo pipefail
image=${1:?immutable image@sha256 required}
revision=${2:?full source SHA required}
env_file=${3:?server env file required}
[[ "$image" =~ ^ghcr.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]] || exit 2
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 2
[[ -r "$env_file" ]] || exit 2
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
probe="$script_dir/../apps/api/scripts/check-readiness.cjs"
[[ -r "$probe" ]] || exit 2
exec 9>/tmp/nearbook-api-deploy.lock
flock -n 9 || { echo 'Another deployment holds the lock' >&2; exit 1; }

active=nearbook-api
candidate=nearbook-api-candidate
backup="nearbook-api-previous-$(date -u +%Y%m%dT%H%M%SZ)"
attempts=${DEPLOY_READY_ATTEMPTS:-90}
[[ "$attempts" =~ ^[1-9][0-9]*$ ]] && (( attempts <= 180 )) || exit 2
renamed=false
new_started=false
stopping=false
previous_revision=legacy

wait_ready() {
  local container=$1 expected=$2 scheduler=$3 origin=${4:-http://127.0.0.1:3001}
  local i
  for ((i=0; i<attempts; i++)); do
    [[ $(docker inspect --format '{{.State.Running}}' "$container") == true ]] || return 1
    if docker exec -i "$container" node - "$expected" "$scheduler" "$origin" < "$probe" 2>/dev/null; then return 0; fi
    sleep 2
  done
  return 1
}

recover() {
  local result=$?
  trap - EXIT INT TERM
  docker rm -f "$candidate" >/dev/null 2>&1 || true
  if [[ "$renamed" == true ]]; then
    if [[ "$new_started" == true ]]; then docker rm -f "$active" >/dev/null 2>&1 || true; fi
    if docker rename "$backup" "$active" && docker start "$active" >/dev/null &&
      wait_ready "$active" "$previous_revision" true &&
      wait_ready "$active" "$previous_revision" true https://api.near-book.com; then
      echo 'Previous container restored and checked' >&2
    else
      echo "ROLLBACK FAILED: inspect retained container $backup / $active" >&2
      result=2
    fi
  elif [[ "$stopping" == true ]]; then
    if ! docker start "$active" >/dev/null || ! wait_ready "$active" "$previous_revision" true ||
      ! wait_ready "$active" "$previous_revision" true https://api.near-book.com; then
      echo 'ROLLBACK FAILED: previous active container did not recover' >&2
      result=2
    fi
  fi
  (( result != 0 )) || result=1
  exit "$result"
}

# Fail before touching the active process when no known-good predecessor exists.
docker inspect "$active" >/dev/null
previous_revision=$(docker exec "$active" node -p 'process.env.API_REVISION || "legacy"')
wait_ready "$active" "$previous_revision" true
docker pull "$image"
[[ $(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image") == "$revision" ]] || exit 1
# Never silently delete a candidate left by a different interrupted deployment.
if docker inspect "$candidate" >/dev/null 2>&1; then
  echo 'Candidate already exists; inspect it before retrying' >&2
  exit 1
fi
trap recover EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
docker run -d --name "$candidate" --restart no --env-file "$env_file" \
  -e API_REVISION="$revision" -e API_SCHEDULER_ENABLED=false "$image" >/dev/null
wait_ready "$candidate" "$revision" false
# Remove the probe instance before enabling the new scheduler. No duplicate cron.
docker rm -f "$candidate" >/dev/null
stopping=true
docker stop --time 30 "$active" >/dev/null
# Set recovery intent before rename so a failure cannot leave the old process stopped.
renamed=true
if ! docker rename "$active" "$backup"; then
  renamed=false
  docker start "$active" >/dev/null
  exit 1
fi
new_started=true
docker run -d --name "$active" --restart unless-stopped -p 3001:3001 \
  --env-file "$env_file" -e API_REVISION="$revision" -e API_SCHEDULER_ENABLED=true "$image" >/dev/null
wait_ready "$active" "$revision" true
# Validate the published socket and the real TLS/proxy path as well as the process.
curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3001/ready >/dev/null
wait_ready "$active" "$revision" true https://api.near-book.com
trap - EXIT INT TERM
echo "Deployment ready: $revision; previous container retained: $backup"
# Deliberately retain predecessor and images. Cleanup is a later reviewed action.
