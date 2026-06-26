#!/bin/sh

INSTALL_DIR="/mnt/us/slowdash"
KUAL_EXT_DIR="/mnt/us/extensions/slowdash"
mkdir -p "$INSTALL_DIR"

cp -r "$(dirname "$0")/data/"* "$INSTALL_DIR/" 2>/dev/null || true

if [ -f "$INSTALL_DIR/bin/display_dashboard.sh" ]; then
  chmod +x "$INSTALL_DIR/bin/"*.sh
fi

# 为 KUAL 创建菜单入口
mkdir -p "$KUAL_EXT_DIR"
if [ -f "$(dirname "$0")/menu.json" ]; then
  cp "$(dirname "$0")/menu.json" "$KUAL_EXT_DIR/"
fi

echo "SlowDash Kindle client installed at $INSTALL_DIR"
