#!/usr/bin/env bash
# Deploy apps/api ON jack-server from this git clone (build locally, swap compose `api`).
# Mirrors scripts/deploy-web.sh but gates on the API /ready probe.
#
#   scripts/deploy-api.sh            # deploy current HEAD (working tree must be clean)
#   scripts/deploy-api.sh --rollback # switch back to the previously deployed image
#
# Server layout (/opt/stacks/nearbook):
#   compose.yaml  `api` service, image nearbook-api:<git sha>, env API_REVISION=<sha>
#   .env          NEARBOOK_API_SCHEDULER_ENABLED (read for the readiness check)
#   .env.api      runtime secrets
#   .api-previous image tag deployed before the current one (for --rollback)
set -euo pipefail

STACK=/opt/stacks/nearbook
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROBE="$ROOT/apps/api/scripts/check-readiness.cjs"

scheduler_flag() {
  local v
  v=$(grep -E '^NEARBOOK_API_SCHEDULER_ENABLED=' "$STACK/.env" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '[:space:]')
  case "$v" in true|false) echo "$v" ;; *) echo false ;; esac
}

wait_ready() { # $1 = revision (40-hex sha, or 'legacy')
  local rev="$1" sched i
  sched=$(scheduler_flag)
  for ((i=0; i<90; i++)); do
    if [ "$(docker inspect -f '{{.State.Running}}' nearbook-api-1 2>/dev/null || echo false)" = true ]; then
      if docker exec -i nearbook-api-1 node - "$rev" "$sched" http://127.0.0.1:3001 < "$PROBE" >/dev/null 2>&1; then
        return 0
      fi
    fi
    sleep 2
  done
  return 1
}

set_service() { # $1 = image ref, $2 = revision
  cd "$STACK"
  sed -i -E "s#^(    image: )nearbook-api:.*#\1$1#" compose.yaml
  sed -i -E "s#^(      API_REVISION: ).*#\1$2#" compose.yaml
  docker compose up -d --no-deps api
}

switch_image() { # $1 = image ref, $2 = revision
  cd "$STACK"
  local current
  current=$(grep -oE 'nearbook-api:[0-9a-f]+' compose.yaml | head -1 || true)
  set_service "$1" "$2"
  if wait_ready "$2"; then
    [ -n "$current" ] && [ "$current" != "$1" ] && echo "$current" > .api-previous
    echo "deployed $1"
  else
    echo "api did not become ready ($1); restoring $current" >&2
    if [ -n "$current" ]; then
      local prevrev=${current#nearbook-api:}
      set_service "$current" "$prevrev"
      if wait_ready "$prevrev" || wait_ready legacy; then
        echo "previous image restored and ready" >&2
      else
        echo "ROLLBACK NOT CONFIRMED READY: inspect nearbook-api-1" >&2
      fi
    fi
    exit 1
  fi
}

if [ "${1:-}" = "--rollback" ]; then
  prev=$(cat "$STACK/.api-previous")
  echo "rolling back to $prev"
  switch_image "$prev" "${prev#nearbook-api:}"
  exit 0
fi

cd "$ROOT"
if [ -n "$(git status --porcelain)" ]; then
  echo "working tree is not clean; commit first so the image tag matches the source" >&2
  exit 1
fi
SHA=$(git rev-parse HEAD)
IMAGE="nearbook-api:$SHA"

echo "==> build $IMAGE"
docker build -f apps/api/Dockerfile -t "$IMAGE" .

echo "==> switch api to $IMAGE (revision $SHA)"
switch_image "$IMAGE" "$SHA"

echo "==> smoke test"
for path in /health /ready; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "https://api.near-book.com$path")
  echo "$code $path"
  [ "$code" = 200 ] || { echo "smoke test failed; run scripts/deploy-api.sh --rollback" >&2; exit 1; }
done
echo "OK"
