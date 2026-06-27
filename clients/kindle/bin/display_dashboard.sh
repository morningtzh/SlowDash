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

TARGET_DIR="${SLOWDASH_CLIENT_ROOT:-/mnt/us/extensions/slowdash}"
mkdir -p "$TARGET_DIR"

LOG_FILE="${SLOWDASH_LOG_FILE:-$TARGET_DIR/slowdash.log}"
exec >> "$LOG_FILE" 2>&1

print_msg() {
  echo "$1"
  if command -v eips >/dev/null 2>&1; then
    eips 2 38 "$1" >/dev/null 2>&1 || true
  fi
}

echo "======================================"
print_msg "[SlowDash] Manual dashboard refresh started at $(date '+%Y-%m-%d %H:%M:%S')"

TMPDIR="${SLOWDASH_TMPDIR:-/tmp/slowdash}"
mkdir -p "$TMPDIR"

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
  DOWNLOADER="curl -kfsSL"
elif command -v wget >/dev/null 2>&1; then
  DOWNLOADER="wget -qO-"
else
  print_msg "[SlowDash] curl or wget is required to refresh the Kindle screen."
  exit 1
fi

download_file() {
  local url="$1"
  local dest="$2"
  if $DOWNLOADER "$url" > "$dest"; then
    return 0
  fi
  if echo "$url" | grep -q "^https://"; then
    local http_url=$(echo "$url" | sed 's|^https://|http://|')
    print_msg "[SlowDash] HTTPS failed, retrying with HTTP: $http_url"
    if $DOWNLOADER "$http_url" > "$dest"; then
      return 0
    fi
  fi
  return 1
}

TIMESTAMP=$(date +%s)
CACHE_BUSTED_URL="${IMAGE_URL}?t=${TIMESTAMP}"

print_msg "[SlowDash] Downloading dashboard image..."
if ! download_file "$CACHE_BUSTED_URL" "$IMAGE_TMP"; then
  print_msg "[SlowDash] Failed to download dashboard image."
  exit 1
fi

mv "$IMAGE_TMP" "$IMAGE_PATH" 2>/dev/null || cat "$IMAGE_TMP" > "$IMAGE_PATH" && rm -f "$IMAGE_TMP"

print_msg "[SlowDash] Refreshed local image at $IMAGE_PATH"

FBINK_CMD=""
if command -v fbink >/dev/null 2>&1; then
  FBINK_CMD="fbink"
elif [ -x "$TARGET_DIR/fbink" ]; then
  FBINK_CMD="$TARGET_DIR/fbink"
fi

if [ -n "$FBINK_CMD" ]; then
  print_msg "[SlowDash] Sending image to display via fbink..."
  $FBINK_CMD -g file="$IMAGE_PATH",halign=CENTER,valign=CENTER || print_msg "[SlowDash] fbink refresh failed"
elif command -v eips >/dev/null 2>&1; then
  print_msg "[SlowDash] Sending image to display via eips..."
  eips -g "$IMAGE_PATH" || print_msg "[SlowDash] eips refresh failed"
else
  print_msg "[SlowDash] No supported E-Ink tool found (eips/fbink)."
fi
