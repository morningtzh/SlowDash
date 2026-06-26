#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/config.sh"

if [ -f "$CONFIG_FILE" ]; then
  . "$CONFIG_FILE"
fi

TARGET_DIR="${SLOWDASH_CLIENT_ROOT:-/mnt/us/slowdash}"
mkdir -p "$TARGET_DIR"

INTERVAL_SECONDS="${SLOWDASH_REFRESH_INTERVAL_SECONDS:-1800}"
LOG_FILE="${SLOWDASH_LOG_FILE:-$TARGET_DIR/slowdash.log}"

while true; do
  echo "[SlowDash] Refreshing at $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
  "$SCRIPT_DIR/check_update.sh" >> "$LOG_FILE" 2>&1 || true
  "$SCRIPT_DIR/display_dashboard.sh" >> "$LOG_FILE" 2>&1 || true
  echo "[SlowDash] Sleeping for ${INTERVAL_SECONDS}s" >> "$LOG_FILE"
  sleep "$INTERVAL_SECONDS"
done
