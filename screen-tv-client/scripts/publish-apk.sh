#!/usr/bin/env bash
# Uploads the release APK to the server so it can be downloaded from
# https://<panel>/apk (Caddy serves ./apk/screentv.apk, see deploy/Caddyfile).
#
#   SCREEN_SERVER=root@host SCREEN_SSH_PORT=3013 npm run apk:publish
#
# Optional: SCREEN_STACK_DIR (default /opt/screen-platform), APK (path to the .apk).
set -euo pipefail
cd "$(dirname "$0")/.."

: "${SCREEN_SERVER:?Set SCREEN_SERVER=user@host}"
PORT="${SCREEN_SSH_PORT:-22}"
DIR="${SCREEN_STACK_DIR:-/opt/screen-platform}/apk"
APK="${APK:-android/app/build/outputs/apk/release/app-release.apk}"
[ -f "$APK" ] || { echo "APK not found: $APK (run 'npm run apk' first)"; exit 1; }

NAME=$(grep -o 'versionName "[^"]*"' android/app/build.gradle | cut -d'"' -f2)
CODE=$(grep -o 'versionCode [0-9]*' android/app/build.gradle | awk '{print $2}')
SIZE=$(stat -f%z "$APK" 2>/dev/null || stat -c%s "$APK")
COMMIT=$(git rev-parse --short HEAD)
DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
VERSION_JSON=$(mktemp)
printf '{"version":"%s","code":%s,"size":%s,"commit":"%s","publishedAt":"%s","file":"screentv.apk"}\n' \
  "$NAME" "$CODE" "$SIZE" "$COMMIT" "$DATE" > "$VERSION_JSON"

echo "Publishing APK $NAME (code $CODE, $((SIZE/1024/1024)) MB) to $SCREEN_SERVER:$DIR"
ssh -p "$PORT" "$SCREEN_SERVER" "mkdir -p '$DIR'"
scp -P "$PORT" "$APK" "$SCREEN_SERVER:$DIR/screentv.apk.tmp"
scp -P "$PORT" "$VERSION_JSON" "$SCREEN_SERVER:$DIR/version.json"
# Atomic swap so a TV downloading right now never gets a half-written file.
ssh -p "$PORT" "$SCREEN_SERVER" "mv '$DIR/screentv.apk.tmp' '$DIR/screentv.apk'"
rm -f "$VERSION_JSON"
echo "Done. Download: https://<panel-host>/apk"
