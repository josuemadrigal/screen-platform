#!/usr/bin/env bash
# Builds the API and web images for the server (linux/amd64) and pushes them to the registry.
# Run from your workstation after `docker login ghcr.io`.
#
#   deploy/build-and-push.sh            # tags :latest
#   deploy/build-and-push.sh v1.0.0     # tags :v1.0.0 and :latest
set -euo pipefail

REGISTRY="${REGISTRY:-ghcr.io/josuemadrigal}"
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
