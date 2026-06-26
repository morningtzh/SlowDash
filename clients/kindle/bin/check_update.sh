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

TMPDIR="${SLOWDASH_TMPDIR:-/tmp/slowdash}"
mkdir -p "$TMPDIR"

if command -v curl >/dev/null 2>&1; then
  DOWNLOADER="curl -fsSL"
elif command -v wget >/dev/null 2>&1; then
  DOWNLOADER="wget -qO-"
else
  echo "[SlowDash] curl or wget is required to download updates."
  exit 1
fi

TARGET_DIR="${SLOWDASH_CLIENT_ROOT:-/mnt/us/slowdash}"
LOCAL_VERSION_FILE="$TARGET_DIR/client.version"
if [ -n "$SLOWDASH_PUBLIC_URL" ]; then
  MANIFEST_URL="${SLOWDASH_PUBLIC_URL%/}/clients/manifest.json"
  UPDATE_URL="${SLOWDASH_PUBLIC_URL%/}/clients/kindle/update.tar.gz"
else
  MANIFEST_URL="${SLOWDASH_SERVER_URL%/}/clients/manifest.json"
  UPDATE_URL="${SLOWDASH_SERVER_URL%/}/clients/kindle/update.tar.gz"
fi

mkdir -p "$TARGET_DIR"

echo "[SlowDash] Fetching manifest from $MANIFEST_URL"
if ! $DOWNLOADER "$MANIFEST_URL" > "$TMPDIR/manifest.json"; then
  echo "[SlowDash] Failed to download manifest."
  exit 1
fi

remote_version=$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "$TMPDIR/manifest.json" | head -n1 | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
remote_update_url=$(grep -oE '"update_url"[[:space:]]*:[[:space:]]*"[^"]+"' "$TMPDIR/manifest.json" | head -n1 | sed 's/.*"update_url"[[:space:]]*:[[:space:]]*"\([^\"]*\)".*/\1/')
if [ -z "$remote_version" ]; then
  echo "[SlowDash] Failed to parse manifest version."
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

echo "[SlowDash] Local version: ${local_version:-none}"
echo "[SlowDash] Remote version: $remote_version"
echo "[SlowDash] Remote update URL: $remote_update_url"

if [ "$remote_version" = "$local_version" ]; then
  echo "[SlowDash] Already latest."
  exit 0
fi

echo "[SlowDash] Downloading update package from $remote_update_url"
if ! $DOWNLOADER "$remote_update_url" > "$TMPDIR/update.tar.gz"; then
  echo "[SlowDash] Failed to download update package."
  exit 1
fi

echo "[SlowDash] Extracting update package to $TARGET_DIR"
tar -xzf "$TMPDIR/update.tar.gz" -C "$TARGET_DIR"

echo "$remote_version" > "$LOCAL_VERSION_FILE"
echo "[SlowDash] Update installed: $remote_version"
