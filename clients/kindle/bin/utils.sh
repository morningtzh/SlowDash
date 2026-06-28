#!/bin/sh
##############################################################################
# Battery-efficient utility functions for SlowDash Kindle scheduler
# Ported from kndl-online-screensaver by cryptomilk, adapted for SlowDash.
##############################################################################

DEFAULT_LOG_FLUSH_SIZE=32768

##############################################################################
# Checks if userstore (FAT partition) is safe to write to.
# Returns 1 (false) during USB mass storage mode.

is_userstore_available () {
	_AVAILABLE=$(lipc-get-prop com.lab126.volumd userstoreIsAvailable 2>/dev/null)
	[ "${_AVAILABLE}" = "1" ]
}

##############################################################################
# Flushes the RAM log buffer to the FAT partition when safe.
# Pass "force" to bypass the LOG_FLUSH_SIZE threshold.

flush_log_buffer () {
	_TEMP_LOG="/tmp/slowdash.log"
	_FORCE="${1}"

	if [ "1" != "${LOGGING}" ] || [ -z "${LOGFILE}" ]; then
		return
	fi
	case "${LOGFILE}" in
		stdout|/dev/stdout|/dev/stderr) return ;;
	esac
	if [ ! -f "${_TEMP_LOG}" ]; then
		return
	fi
	if ! is_userstore_available; then
		return
	fi

	if [ "${_FORCE}" != "force" ]; then
		_LOG_SIZE=$(stat -c%s "${_TEMP_LOG}" 2>/dev/null || echo "0")
		if [ "${_LOG_SIZE}" -lt "${LOG_FLUSH_SIZE:-${DEFAULT_LOG_FLUSH_SIZE}}" ]; then
			return
		fi
	fi

	mkdir -p "$(dirname "${LOGFILE}")" 2>/dev/null
	cat "${_TEMP_LOG}" >> "${LOGFILE}" 2>/dev/null && rm -f "${_TEMP_LOG}" 2>/dev/null
}

##############################################################################
# Logs a message. File destinations buffer to RAM and flush to FAT when safe.

logger () {
	MSG=${1}

	# do nothing if logging is not enabled
	if [ "1" != "${LOGGING}" ]; then
		return
	fi

	# if no logfile is specified, set a default
	if [ -z "${LOGFILE}" ]; then
		LOGFILE=stdout
	fi

	case "${LOGFILE}" in
		stdout|/dev/stdout|/dev/stderr)
			echo "$(date): ${LOG_TAG:+${LOG_TAG}: }${MSG}" >> "${LOGFILE}"
			;;
		*)
			echo "$(date): ${LOG_TAG:+${LOG_TAG}: }${MSG}" >> "/tmp/slowdash.log"
			flush_log_buffer
			;;
	esac
}

##############################################################################
# Waits for WiFi to reach CONNECTED state, polling up to 4 times.
# $1 - log message to print before waiting
# Sets globals: WIFI_TRIES, WIFI_STATE

wait_for_wifi () {
	logger "$1"
	sleep 3
	WIFI_TRIES=4
	while [ "${WIFI_TRIES}" -gt 0 ]; do
		WIFI_STATE=$(lipc-get-prop com.lab126.wifid cmState)
		logger "WiFi state: ${WIFI_STATE}"
		if [ "${WIFI_STATE}" = "CONNECTED" ]; then
			break
		fi
		WIFI_TRIES=$((WIFI_TRIES - 1))
		# Skip trailing sleep on last iteration to avoid unnecessary delay
		if [ "${WIFI_TRIES}" -gt 0 ]; then
			sleep 2
		fi
	done
	if [ "${WIFI_TRIES}" -eq 0 ]; then
		logger "WiFi did not connect after retries"
	fi
}

##############################################################################
# Retrieves the current time in seconds

currentTime () {
	date +%s
}

##############################################################################
# Tells powerd to wake the device in WAKEUP_DELAY seconds via rtcWakeup.
# powerd only accepts this in readyToSuspend state; other states return
# lipcPropErrInvalidState (logged but harmless).
# arguments: $1 - time in seconds from now, $2 - reason label for logging

set_rtc_wakeup () {
	WAKEUP_DELAY=${1}
	WAKEUP_REASON=${2:-suspend}
	if [ "${WAKEUP_DELAY}" -le 0 ]; then
		logger "RTC wakeup (${WAKEUP_REASON}): skipped (already past)"
		return 0
	fi
	LIPC_RESULT=$(lipc-set-prop -i com.lab126.powerd rtcWakeup "${WAKEUP_DELAY}" 2>&1); LIPC_RC=$?
	if [ "${LIPC_RC}" -eq 0 ]; then
		logger "RTC wakeup (${WAKEUP_REASON}): ${WAKEUP_DELAY}s"
	else
		logger "RTC wakeup (${WAKEUP_REASON}): rejected (${LIPC_RESULT})"
	fi
	return "${LIPC_RC}"
}

##############################################################################
# Battery-efficient wait function that allows proper suspension
# arguments: $1 - time in seconds from now

wait_for_suspend () {
	WAIT_SECONDS=${1}
	logger "Starting battery-efficient wait for ${WAIT_SECONDS} seconds"

	_NOW=$(currentTime)
	ENDTIME=$(( _NOW + WAIT_SECONDS ))

	# Event loop: wait for powerd state transitions until ENDTIME.
	#   readyToSuspend        => set RTC alarm so device wakes for next update
	#   wakeupFromSuspend     => arm RTC preemptively (best-effort, powerd may
	#                            reject outside readyToSuspend), then re-enter
	#                            loop to wait the remaining time
	#   timeout (no event)    => REMAINING <= 0 at top of loop, exit
	while true; do
		_NOW=$(currentTime)
		REMAINING=$(( ENDTIME - _NOW ))
		if [ "${REMAINING}" -le 0 ]; then
			break
		fi

		EVENT=$(lipc-wait-event -s "${REMAINING}" com.lab126.powerd readyToSuspend,wakeupFromSuspend,resuming,outOfScreenSaver,active 2>/dev/null)
		logger "Received event: ${EVENT:-timeout}"

		case "${EVENT}" in
			readyToSuspend*)
				REMAINING=$(( ENDTIME - $(currentTime) ))
				set_rtc_wakeup "${REMAINING}" "suspend"
				;;
			wakeupFromSuspend*|resuming*|outOfScreenSaver*|active*)
				_CURRENT_STATUS=$(lipc-get-prop com.lab126.powerd status 2>/dev/null)
				case "${_CURRENT_STATUS}" in
					*"Active"*)
						logger "Device manually awoken during wait, breaking out to trigger update on next sleep"
						break
						;;
					*)
						logger "Device dark wake (status: ${_CURRENT_STATUS}), continuing wait"
						REMAINING=$(( ENDTIME - $(currentTime) ))
						set_rtc_wakeup "${REMAINING}" "preemptive"
						;;
				esac
				;;
		esac
	done

	logger "Wait completed, device should be awake"
}

##############################################################################
# Clean RTC wakeup function for device shutdown/cleanup
clear_rtc_wakeup () {
	logger "Clearing RTC wakeup alarm"
	echo 0 > "/sys/class/rtc/rtc${RTC}/wakealarm" 2>/dev/null
}

##############################################################################
# Refresh the screen using fbink (preferred) or eips (fallback).
# fbink is copied to /tmp on first use to avoid holding open handles on FAT32.
# arguments: $1 - path to the PNG image file

fbink_refresh () {
	_IMAGE="${1}"

	if [ -z "${_IMAGE}" ] || [ ! -f "${_IMAGE}" ]; then
		logger "fbink_refresh: no image file provided or file missing"
		return 1
	fi

	# Try fbink first (preferred — better rendering, dithering support)
	_FBINK_CMD=""
	if [ -x "/tmp/fbink" ]; then
		_FBINK_CMD="/tmp/fbink"
	elif command -v fbink >/dev/null 2>&1; then
		# System-installed fbink
		_FBINK_CMD="fbink"
	elif [ -x "${EXTENSION_DIR}/fbink" ]; then
		# fbink bundled with the extension — copy to /tmp to avoid FAT handles
		cp "${EXTENSION_DIR}/fbink" /tmp/fbink 2>/dev/null
		chmod +x /tmp/fbink 2>/dev/null
		_FBINK_CMD="/tmp/fbink"
	fi

	if [ -n "${_FBINK_CMD}" ]; then
		logger "Refreshing screen via fbink: ${_FBINK_CMD}"
		${_FBINK_CMD} -g file="${_IMAGE}",halign=CENTER,valign=CENTER 2>&1
		_RC=$?
		if [ "${_RC}" -ne 0 ]; then
			logger "fbink refresh failed (rc=${_RC}), falling back to eips"
		else
			return 0
		fi
	fi

	# Fallback to eips
	logger "Refreshing screen via eips"
	EIPS_OUTPUT=$(eips -f -g "${_IMAGE}" 2>&1)
	EIPS_EXIT=$?
	if [ "${EIPS_EXIT}" -ne 0 ] || [ -n "${EIPS_OUTPUT}" ]; then
		logger "eips exit=${EIPS_EXIT} output=${EIPS_OUTPUT}"
	fi
	return "${EIPS_EXIT}"
}

##############################################################################
# Cleanup function for graceful shutdown
cleanup_and_exit () {
	logger "Performing cleanup before exit"
	flush_log_buffer force
	clear_rtc_wakeup
	exit 0
}

trap cleanup_and_exit TERM INT QUIT
