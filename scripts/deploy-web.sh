#!/usr/bin/env bash
# Deploy apps/web ON jack-server, directly from this git clone.
# Builds the image locally and swaps the compose `web` service — no ssh/rsync,
# because this runs on the server itself.
#
#   scripts/deploy-web.sh            # deploy current HEAD (working tree must be clean)
#   scripts/deploy-web.sh --rollback # switch back to the previously deployed image
#
# Server layout (/opt/stacks/nearbook):
#   compose.yaml     `web` service, image nearbook-web:<git sha>
#   .env.web-build   public build-time values (NEXT_PUBLIC_*, INTERNAL_API_URL, APP_ENV)
#   .web-previous    image tag deployed before the current one (for --rollback)
set -euo pipefail

STACK=/opt/stacks/nearbook
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

switch_image() { # $1 = full image ref
  cd "$STACK"
  local current
  current=$(grep -oE 'nearbook-web:[0-9a-f]+' compose.yaml | head -1 || true)
  sed -i -E "s#^(    image: )nearbook-web:.*#\1$1#" compose.yaml
  docker compose up -d --no-deps web
  local s=none
  for _ in $(seq 1 30); do
    s=$(docker inspect -f '{{.State.Health.Status}}' nearbook-web-1 2>/dev/null || echo none)
    [ "$s" = healthy ] && break
    sleep 2
  done
  if [ "$s" != healthy ]; then
    echo "web did not become healthy ($s); restoring $current" >&2
    if [ -n "$current" ]; then
      sed -i -E "s#^(    image: )nearbook-web:.*#\1$current#" compose.yaml
      docker compose up -d --no-deps web
    fi
    exit 1
  fi
  if [ -n "$current" ] && [ "$current" != "$1" ]; then
    echo "$current" > .web-previous
  fi
  echo "deployed $1"
}

if [ "${1:-}" = "--rollback" ]; then
  prev=$(cat "$STACK/.web-previous")
  echo "rolling back to $prev"
  switch_image "$prev"
  exit 0
fi

cd "$ROOT"
if [ -n "$(git status --porcelain)" ]; then
  echo "working tree is not clean; commit first so the image tag matches the source" >&2
  exit 1
fi
SHA=$(git rev-parse HEAD)
IMAGE="nearbook-web:$SHA"

echo "==> build $IMAGE"
args=()
while IFS= read -r line; do
  case "$line" in ''|'#'*) continue;; esac
  args+=(--build-arg "$line")
done < "$STACK/.env.web-build"
# --network host + add-host lets build-time prerendering reach the API on 127.0.0.1:3001
docker build --network host --add-host nearbook-api:127.0.0.1 \
  -f apps/web/Dockerfile "${args[@]}" -t "$IMAGE" .

echo "==> switch web to $IMAGE"
switch_image "$IMAGE"

echo "==> smoke test"
for path in / /robots.txt /api/health; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "https://www.near-book.com$path")
  echo "$code $path"
  [ "$code" = 200 ] || { echo "smoke test failed; run scripts/deploy-web.sh --rollback" >&2; exit 1; }
done
echo "OK"
