#!/bin/sh
#
##############################################################################
#
# Fetch dashboard image from SlowDash server and display it.
# Ported from kndl-online-screensaver by cryptomilk, adapted for SlowDash.
# Uses fbink (preferred) with eips fallback.

# shellcheck disable=SC2034
LOG_TAG="update"

SCRIPT_DIR=$(dirname "$0")
cd "${SCRIPT_DIR}" || exit 1

FORCE_RUN=0
if [ "$1" = "force" ]; then
	FORCE_RUN=1
	eips 2 38 "Manual update requested...       " 2>/dev/null || true
fi

if [ -e "config.sh" ]; then
	# shellcheck disable=SC1091
	. ./config.sh
else
	TMPFILE=/tmp/tmp.slowdash.png
fi

if [ -e "utils.sh" ]; then
	# shellcheck disable=SC1091
	. ./utils.sh
else
	echo "Could not find utils.sh in ${SCRIPT_DIR}"
	exit 1
fi

# shellcheck disable=SC2002
MOUNT_OPTS=$(cat /proc/mounts 2>/dev/null | grep ' /mnt/us ' || true)
logger "Mount options: ${MOUNT_OPTS}"

if [ -z "${IMAGE_URI}" ]; then
	logger "No image URL has been set. Please edit config.sh."
	exit 1
fi

WIFI_STATUS=$(lipc-get-prop com.lab126.cmd wirelessEnable)
logger "Initial WiFi status: ${WIFI_STATUS}"

if [ 0 -eq "${WIFI_STATUS}" ]; then
	DISABLE_WIFI=1
fi

WIFI_STATE=$(lipc-get-prop com.lab126.wifid cmState)
if [ "${WIFI_STATE}" != "CONNECTED" ]; then
	logger "WiFi not connected (state: ${WIFI_STATE}), cycling"
	lipc-set-prop com.lab126.cmd wirelessEnable 0
	sleep 2
	lipc-set-prop com.lab126.cmd wirelessEnable 1
	wait_for_wifi "Waiting for WiFi to connect..."
else
	logger "WiFi already connected"
fi

WIFI_CONNECTION=$(lipc-get-prop com.lab126.wifid cmState)
logger "WiFi connection state: ${WIFI_CONNECTION}"

TIMER=${NETWORK_TIMEOUT}
CONNECTED=0
PING_ATTEMPTS=0

logger "Starting network connectivity test with ${NETWORK_TIMEOUT} second timeout"

while [ 0 -eq "${CONNECTED}" ]; do
	PING_ATTEMPTS=$((PING_ATTEMPTS + 1))

	if ping -c 1 -w 2 "${TEST_DOMAIN}" > /dev/null 2>&1; then
		CONNECTED=1
		logger "Connected after ${PING_ATTEMPTS} ping attempts"
	else
		if [ $((PING_ATTEMPTS % 10)) -eq 0 ]; then
			PING_RESULT=$(ping -c 1 -w 2 "${TEST_DOMAIN}" 2>&1)
			logger "Ping attempt ${PING_ATTEMPTS} to ${TEST_DOMAIN} failed: ${PING_RESULT}"

			CURRENT_WIFI_STATE=$(lipc-get-prop com.lab126.wifid cmState)
			logger "WiFi state during ping failure: ${CURRENT_WIFI_STATE}"
		fi

		TIMER=$((TIMER - 1))
		if [ 0 -eq "${TIMER}" ]; then
			logger "No internet after ${NETWORK_TIMEOUT}s and ${PING_ATTEMPTS} pings, aborting."
			break
		else
			sleep 1
		fi
	fi
done

if [ 1 -eq "${CONNECTED}" ]; then
	# We will log the URL after determining FETCH_URI

	FETCH_URI="${IMAGE_URI}"
	# Fallback to HTTP for old Kindles with TLS issues
	FETCH_URI=$(echo "${FETCH_URI}" | sed 's|^https://|http://|')
	
	if [ "${REQUEST_RESIZE:-0}" -eq 1 ] && [ -n "${W}" ] && [ -n "${H}" ]; then
		case "${FETCH_URI}" in
			*"?"*) FETCH_URI="${FETCH_URI}&w=${W}&h=${H}" ;;
			*)     FETCH_URI="${FETCH_URI}?w=${W}&h=${H}" ;;
		esac
	fi

	# Report battery state so the server can expose it as sensor data
	BATTERY_LEVEL=$(gasgauge-info -s 2>/dev/null)
	IS_CHARGING=$(lipc-get-prop com.lab126.powerd isCharging)
	if [ -n "${BATTERY_LEVEL}" ]; then
		case "${FETCH_URI}" in
			*"?"*) FETCH_URI="${FETCH_URI}&batteryLevel=${BATTERY_LEVEL}&isCharging=${IS_CHARGING}" ;;
			*)     FETCH_URI="${FETCH_URI}?batteryLevel=${BATTERY_LEVEL}&isCharging=${IS_CHARGING}" ;;
		esac
	fi

	# Add timestamp cache buster
	TIMESTAMP=$(date +%s)
	case "${FETCH_URI}" in
		*"?"*) FETCH_URI="${FETCH_URI}&t=${TIMESTAMP}" ;;
		*)     FETCH_URI="${FETCH_URI}?t=${TIMESTAMP}" ;;
	esac

	logger "Network up, downloading image from ${FETCH_URI}"

	# Conditional fetch: send If-None-Match so the server can return 304
	ETAG_FILE="/tmp/.slowdash_etag"
	HEADERS_FILE="/tmp/wget_headers.tmp"
	ETAG=""
	if [ -f "${ETAG_FILE}" ]; then
		read -r ETAG < "${ETAG_FILE}"
	fi

	if [ -n "${ETAG}" ]; then
		wget --no-check-certificate -q -S -T 30 -t 1 \
			--header="If-None-Match: ${ETAG}" \
			-O "${TMPFILE}" "${FETCH_URI}" 2>"${HEADERS_FILE}"
	else
		wget --no-check-certificate -q -S -T 30 -t 1 \
			-O "${TMPFILE}" "${FETCH_URI}" 2>"${HEADERS_FILE}"
	fi
	WGET_EXIT_CODE=$?

	# Extract final HTTP status code from response headers
	HTTP_CODE=$(grep "HTTP/" "${HEADERS_FILE}" | sed -n '$ s/.* \([0-9][0-9]*\) .*/\1/p')

	CACHED_IMAGE="/tmp/slowdash_cached.png"

	if [ "${HTTP_CODE}" = "304" ]; then
		logger "Image unchanged (304), using cached image for refresh if needed"
		rm -f "${TMPFILE}" "${HEADERS_FILE}"
		TMPFILE="${CACHED_IMAGE}"
		# Ensure cached image exists, else we can't refresh
		if [ ! -f "${TMPFILE}" ]; then
			logger "Cached image not found, cannot refresh"
			DO_REFRESH=0
		else
			# Determine if we should refresh based on device status
			DEVICE_STATUS=$(lipc-get-prop com.lab126.powerd status)
			logger "Device status before refresh (304): ${DEVICE_STATUS}"
			DO_REFRESH=1
			case "${DEVICE_STATUS}" in
				*"Active"*)
					if [ "${FORCE_RUN}" -eq 1 ]; then
						logger "Device active, but force refresh requested"
					else
						logger "Device active, skipping screen refresh (304)"
						DO_REFRESH=0
					fi
					;;
			esac
		fi

		if [ "${DO_REFRESH:-0}" -eq 1 ]; then
			logger "Refreshing screen from cached image"
			fbink_refresh "${TMPFILE}"
		fi
	elif [ "${WGET_EXIT_CODE}" -eq 0 ]; then
		# Cache the ETag for the next conditional request
		NEW_ETAG=$(awk '/ETag:/ { print $2 }' "${HEADERS_FILE}")
		if [ -n "${NEW_ETAG}" ]; then
			printf '%s' "${NEW_ETAG}" > "${ETAG_FILE}"
		fi
		rm -f "${HEADERS_FILE}"

		logger "Dashboard image updated from ${IMAGE_URI}"
		cp "${TMPFILE}" "${CACHED_IMAGE}"

		DEVICE_STATUS=$(lipc-get-prop com.lab126.powerd status)
		logger "Device status before refresh: ${DEVICE_STATUS}"
		
		DO_REFRESH=1
		case "${DEVICE_STATUS}" in
			*"Active"*)
				if [ "${FORCE_RUN}" -eq 1 ]; then
					logger "Device active, but force refresh requested"
				else
					logger "Device active, skipping screen refresh"
					DO_REFRESH=0
				fi
				;;
		esac

		if [ "${DO_REFRESH}" -eq 1 ]; then
			logger "Refreshing screen"
			if [ "${FORCE_RUN}" -eq 1 ]; then
				eips 2 38 "Refreshing screen...           " 2>/dev/null || true
			fi
			fbink_refresh "${TMPFILE}"
			# if [ "${FORCE_RUN}" -eq 1 ]; then
			# 	eips 2 38 "Refresh complete.              " 2>/dev/null || true
			# fi
		fi

		if [ "${WRITE_SCREENSAVER:-0}" -eq 1 ] && is_userstore_available; then
			logger "Overwriting screensaver file ${SCREENSAVERFILE}"
			cp "${TMPFILE}" "${SCREENSAVERFILE}" 2>/dev/null
			sync
		fi
		rm -f "${TMPFILE}"
	else
		WGET_OUTPUT=$(cat "${HEADERS_FILE}" 2>/dev/null)
		rm -f "${HEADERS_FILE}"
		logger "wget failed with exit code ${WGET_EXIT_CODE} for ${IMAGE_URI}"

		if [ -n "${WGET_OUTPUT}" ]; then
			logger "wget error: ${WGET_OUTPUT}"
		fi

		if [ -f "${TMPFILE}" ]; then
			rm -f "${TMPFILE}"
			logger "Removed incomplete temporary file ${TMPFILE}"
		fi

		if [ "${DONOTRETRY:-0}" -eq 1 ]; then
			touch "${TMPFILE}"
		fi
	fi
else
	logger "No network connection, skipping image download"
fi

if [ "${DISABLE_WIFI:-0}" -eq 1 ]; then
	logger "Disabling WiFi"
	lipc-set-prop com.lab126.cmd wirelessEnable 0
fi

if [ "${FORCE_RUN}" -eq 1 ]; then
	flush_log_buffer force
fi
