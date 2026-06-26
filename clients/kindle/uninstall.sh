#!/bin/sh

INSTALL_DIR="/mnt/us/slowdash"
KUAL_EXT_DIR="/mnt/us/extensions/slowdash"

if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
fi

if [ -d "$KUAL_EXT_DIR" ]; then
  rm -rf "$KUAL_EXT_DIR"
fi

echo "SlowDash Kindle client uninstalled."
