#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/config.sh"

if [ -f "$CONFIG_FILE" ]; then
  . "$CONFIG_FILE"
fi

if [ -z "$SLOWDASH_SERVER_URL" ]; then
  echo "[SlowDash] SLOWDASH_SERVER_URL is not configured. Set it in clients/kindle/config.sh or environment."
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
print_msg "[SlowDash] Manual update check started at $(date '+%Y-%m-%d %H:%M:%S')"

TMPDIR="${SLOWDASH_TMPDIR:-/tmp/slowdash}"
mkdir -p "$TMPDIR"

if command -v curl >/dev/null 2>&1; then
  DOWNLOADER="curl -kfsSL"
elif command -v wget >/dev/null 2>&1; then
  DOWNLOADER="wget -qO-"
else
  print_msg "[SlowDash] curl or wget is required to download updates."
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

LOCAL_VERSION_FILE="$TARGET_DIR/client.version"
if [ -n "$SLOWDASH_PUBLIC_URL" ]; then
  MANIFEST_URL="${SLOWDASH_PUBLIC_URL%/}/clients/manifest.json"
  UPDATE_URL="${SLOWDASH_PUBLIC_URL%/}/clients/kindle/update.tar.gz"
else
  MANIFEST_URL="${SLOWDASH_SERVER_URL%/}/clients/manifest.json"
  UPDATE_URL="${SLOWDASH_SERVER_URL%/}/clients/kindle/update.tar.gz"
fi

mkdir -p "$TARGET_DIR"

TIMESTAMP=$(date +%s)
CACHE_BUSTED_MANIFEST="${MANIFEST_URL}?t=${TIMESTAMP}"

print_msg "[SlowDash] Fetching manifest from $CACHE_BUSTED_MANIFEST"
if ! download_file "$CACHE_BUSTED_MANIFEST" "$TMPDIR/manifest.json"; then
  print_msg "[SlowDash] Failed to download manifest."
  exit 1
fi

remote_version=$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "$TMPDIR/manifest.json" | head -n1 | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
remote_update_url=$(grep -oE '"update_url"[[:space:]]*:[[:space:]]*"[^"]+"' "$TMPDIR/manifest.json" | head -n1 | sed 's/.*"update_url"[[:space:]]*:[[:space:]]*"\([^\"]*\)".*/\1/')
if [ -z "$remote_version" ]; then
  print_msg "[SlowDash] Failed to parse manifest version."
  cat "$TMPDIR/manifest.json"
  exit 1
fi

if [ -z "$remote_update_url" ]; then
  remote_update_url="$UPDATE_URL"
fi

local_version=""
if [ -f "$LOCAL_VERSION_FILE" ]; then
  local_version="$(cat "$LOCAL_VERSION_FILE")"
fi

print_msg "[SlowDash] Local version: ${local_version:-none}"
print_msg "[SlowDash] Remote version: $remote_version"

if [ "$remote_version" = "$local_version" ]; then
  print_msg "[SlowDash] Already latest."
  exit 0
fi

print_msg "[SlowDash] Downloading update package..."
CACHE_BUSTED_UPDATE="${remote_update_url}?t=${TIMESTAMP}"
if ! download_file "$CACHE_BUSTED_UPDATE" "$TMPDIR/update.tar.gz"; then
  print_msg "[SlowDash] Failed to download update package."
  exit 1
fi

print_msg "[SlowDash] Extracting update package..."
tar -xzf "$TMPDIR/update.tar.gz" -C "$TARGET_DIR"

echo "$remote_version" > "$LOCAL_VERSION_FILE"
print_msg "[SlowDash] Update installed: $remote_version"
