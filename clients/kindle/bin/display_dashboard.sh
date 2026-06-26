#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/config.sh"

if [ -f "$CONFIG_FILE" ]; then
  . "$CONFIG_FILE"
fi

if [ -z "$SLOWDASH_SERVER_URL" ]; then
  echo "[SlowDash] SLOWDASH_SERVER_URL is not configured."
  exit 1
fi

TARGET_DIR="${SLOWDASH_CLIENT_ROOT:-/mnt/us/slowdash}"
TMPDIR="${SLOWDASH_TMPDIR:-/tmp/slowdash}"
mkdir -p "$TARGET_DIR" "$TMPDIR"

if [ -n "$SLOWDASH_IMAGE_URL" ]; then
  IMAGE_URL="$SLOWDASH_IMAGE_URL"
elif [ -n "$SLOWDASH_PUBLIC_URL" ]; then
  IMAGE_URL="${SLOWDASH_PUBLIC_URL%/}/dashboard.png"
else
  IMAGE_URL="${SLOWDASH_SERVER_URL%/}/dashboard.png"
fi
IMAGE_PATH="$TARGET_DIR/dashboard.png"
IMAGE_TMP="$TMPDIR/dashboard.png"

if command -v curl >/dev/null 2>&1; then
  echo "[SlowDash] Downloading dashboard image from $IMAGE_URL"
  curl -fsSL "$IMAGE_URL" -o "$IMAGE_TMP"
elif command -v wget >/dev/null 2>&1; then
  echo "[SlowDash] Downloading dashboard image from $IMAGE_URL"
  wget -qO "$IMAGE_TMP" "$IMAGE_URL"
else
  echo "[SlowDash] curl or wget is required to refresh the Kindle screen."
  exit 1
fi

mv "$IMAGE_TMP" "$IMAGE_PATH"

echo "[SlowDash] Refreshed local image at $IMAGE_PATH"

if command -v eips >/dev/null 2>&1; then
  echo "[SlowDash] Sending image to Kindle display via eips"
  eips -g "$IMAGE_PATH" >/dev/null 2>&1 || echo "[SlowDash] eips refresh failed"
elif command -v fbink >/dev/null 2>&1; then
  echo "[SlowDash] Sending image to Kindle display via fbink"
  fbink -g "$IMAGE_PATH" >/dev/null 2>&1 || echo "[SlowDash] fbink refresh failed"
else
  echo "[SlowDash] No supported E-Ink display tool found (eips/fbink)."
fi
