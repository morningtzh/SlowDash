#!/bin/sh

myip="$(ifconfig wlan0 | grep 'inet addr' | cut -d ':' -f 2 | cut -d ' ' -f 1)"
if [ -z "$myip" ]; then
  # Fallback for different ifconfig output
  myip="$(ifconfig wlan0 | grep 'inet ' | awk '{print $2}' | cut -d ':' -f 2)"
fi

if [ -z "$myip" ]; then
  /usr/sbin/eips 2 38 "WiFi: Not connected                             " 2>/dev/null || true
else
  /usr/sbin/eips 2 38 "WiFi IP: $myip                                  " 2>/dev/null || true
fi

if pgrep -f "scheduler.sh" >/dev/null 2>&1; then
  /usr/sbin/eips 2 39 "Auto-update: RUNNING                            " 2>/dev/null || true
else
  /usr/sbin/eips 2 39 "Auto-update: NOT RUNNING                        " 2>/dev/null || true
fi
