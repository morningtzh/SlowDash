#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/config.sh"

if [ -f "$CONFIG_FILE" ]; then
  . "$CONFIG_FILE"
fi

TARGET_DIR="${SLOWDASH_CLIENT_ROOT:-/mnt/us/extensions/slowdash}"
mkdir -p "$TARGET_DIR"

LOG_FILE="${SLOWDASH_LOG_FILE:-$TARGET_DIR/slowdash.log}"

print_msg() {
  echo "$1"
  if command -v eips >/dev/null 2>&1; then
    eips 2 38 "$1" >/dev/null 2>&1 || true
  fi
}

# 简单的日志轮转：如果日志文件大于 1MB，则重命名备份
if [ -f "$LOG_FILE" ]; then
    LOG_SIZE=$(wc -c < "$LOG_FILE" 2>/dev/null || echo 0)
    if [ "$LOG_SIZE" -gt 1048576 ]; then
        mv "$LOG_FILE" "$LOG_FILE.1"
    fi
fi

get_wait_seconds() {
    if [ -z "$SLOWDASH_SCHEDULE" ]; then
        echo "${SLOWDASH_REFRESH_INTERVAL_SECONDS:-1800}"
        return
    fi
    
    local HM=$(date +'%H %M')
    local H=${HM% *}
    local M=${HM#* }
    local CURRENT_MINUTES=$(( ${H#0} * 60 + ${M#0} ))
    local CHOSEN_INTERVAL=${SLOWDASH_REFRESH_INTERVAL_SECONDS:-1800}
    local STARTHOUR STARTMINUTE ENDHOUR ENDMINUTE INTERVAL schedule
    
    for schedule in $SLOWDASH_SCHEDULE; do
        read -r STARTHOUR STARTMINUTE ENDHOUR ENDMINUTE INTERVAL <<EOF
$(echo " $schedule" | sed -e 's/[:,=,\,,-]/ /g' -e 's/\([^0-9]\)0\([[:digit:]]\)/\1\2/g')
EOF
        local START=$(( 60 * STARTHOUR + STARTMINUTE ))
        local END=$(( 60 * ENDHOUR + ENDMINUTE ))
        
        if [ "$START" -gt "$END" ]; then
            if [ "$CURRENT_MINUTES" -ge "$START" ] || [ "$CURRENT_MINUTES" -lt "$END" ]; then
                echo "$INTERVAL"
                return
            fi
        else
            if [ "$CURRENT_MINUTES" -ge "$START" ] && [ "$CURRENT_MINUTES" -lt "$END" ]; then
                echo "$INTERVAL"
                return
            fi
        fi
    done
    
    echo "$CHOSEN_INTERVAL"
}

wait_for_suspend() {
    local WAIT_SECONDS=$1
    echo "[SlowDash] Starting battery-efficient wait for ${WAIT_SECONDS} seconds" >> "$LOG_FILE"
    
    local NOW=$(date +%s)
    local ENDTIME=$(( NOW + WAIT_SECONDS ))
    
    while true; do
        NOW=$(date +%s)
        local REMAINING=$(( ENDTIME - NOW ))
        if [ "$REMAINING" -le 0 ]; then
            break
        fi
        
        if command -v lipc-wait-event >/dev/null 2>&1; then
            local EVENT=$(lipc-wait-event -s "${REMAINING}" com.lab126.powerd readyToSuspend,wakeupFromSuspend,resuming 2>/dev/null)
            
            case "${EVENT}" in
                readyToSuspend*|wakeupFromSuspend*|resuming*)
                    REMAINING=$(( ENDTIME - $(date +%s) ))
                    if [ "$REMAINING" -gt 0 ]; then
                        lipc-set-prop -i com.lab126.powerd rtcWakeup "${REMAINING}" 2>/dev/null || true
                    fi
                    ;;
            esac
        else
            sleep "$REMAINING"
            break
        fi
    done
}

wait_for_wifi() {
    if command -v lipc-get-prop >/dev/null 2>&1; then
        local WIFI_TRIES=15
        while [ "$WIFI_TRIES" -gt 0 ]; do
            local WIFI_STATE=$(lipc-get-prop com.lab126.wifid cmState 2>/dev/null)
            if [ "$WIFI_STATE" = "CONNECTED" ]; then
                return 0
            fi
            sleep 2
            WIFI_TRIES=$((WIFI_TRIES - 1))
        done
        echo "[SlowDash] WiFi not connected after wait." >> "$LOG_FILE"
        return 1
    fi
    return 0
}

do_update_cycle() {
    echo "[SlowDash] Refreshing at $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
    
    if command -v lipc-set-prop >/dev/null 2>&1; then
        lipc-set-prop -i com.lab126.powerd deferSuspend 120 2>/dev/null || true
    fi
    
    wait_for_wifi
    
    "$SCRIPT_DIR/check_update.sh" >> "$LOG_FILE" 2>&1 || true
    "$SCRIPT_DIR/display_dashboard.sh" >> "$LOG_FILE" 2>&1 || true
    
    if command -v lipc-set-prop >/dev/null 2>&1; then
        lipc-set-prop -i com.lab126.powerd deferSuspend 0 2>/dev/null || true
    fi
}

print_msg "[SlowDash] Service started at $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"

while true; do
    DEVICE_STATUS="Screen Saver"
    if command -v lipc-get-prop >/dev/null 2>&1; then
        DEVICE_STATUS=$(lipc-get-prop com.lab126.powerd status 2>/dev/null || echo "Screen Saver")
    fi
    
    case "${DEVICE_STATUS}" in
        *"Screen Saver"*|*"Ready"*|*"Suspended"*)
            do_update_cycle
            
            INTERVAL_SECONDS=$(get_wait_seconds)
            wait_for_suspend "$INTERVAL_SECONDS"
            ;;
        *"Active"*)
            echo "[SlowDash] Device active, waiting for screensaver..." >> "$LOG_FILE"
            if command -v lipc-wait-event >/dev/null 2>&1; then
                lipc-wait-event -s 180 com.lab126.powerd goingToScreenSaver 2>/dev/null || true
            else
                sleep 60
            fi
            ;;
        *)
            wait_for_suspend 60
            ;;
    esac
done
