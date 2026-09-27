#!/usr/bin/env bash
# Manual fallback: builds the API and web images for the server (linux/amd64) and pushes
# them to Docker Hub. Normally GitHub Actions does this on every push to main; use this
# only when you need to publish without going through CI. Run after `docker login`.
#
#   deploy/build-and-push.sh            # tags :latest
#   deploy/build-and-push.sh v1.0.0     # tags :v1.0.0 and :latest
set -euo pipefail

REGISTRY="${REGISTRY:-josueahp}"
TAG="${1:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

build() {
  local name="$1" context="$2" dockerfile="$3"
  local image="$REGISTRY/$name"
  echo "==> $image:$TAG ($PLATFORM)"
  docker buildx build --platform "$PLATFORM" \
    -f "$dockerfile" \
    -t "$image:$TAG" -t "$image:latest" \
    --push "$context"
}

build screen-api "$ROOT/screen-api" "$ROOT/screen-api/Dockerfile"
build screen-web "$ROOT" "$ROOT/deploy/Dockerfile.web"

echo
echo "Done. On the server: docker compose pull && docker compose up -d"
