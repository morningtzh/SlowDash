#!/bin/sh
#
##############################################################################
# SlowDash OTA self-update check.
# Downloads manifest.json from the server, compares version, and extracts
# update.tar.gz if a newer version is available.
##############################################################################

# shellcheck disable=SC2034
LOG_TAG="ota"

SCRIPT_DIR=$(dirname "$0")
cd "${SCRIPT_DIR}" || exit 1

FORCE_RUN=0
if [ "$1" = "force" ]; then
	FORCE_RUN=1
	eips 2 38 "Checking for OTA updates...        " 2>/dev/null || true
fi

if [ -e "config.sh" ]; then
	# shellcheck disable=SC1091
	. ./config.sh
fi

if [ -e "utils.sh" ]; then
	# shellcheck disable=SC1091
	. ./utils.sh
else
	echo "Could not find utils.sh in ${SCRIPT_DIR}"
	exit 1
fi

TARGET_DIR="${EXTENSION_DIR:-/mnt/us/extensions/slowdash}"
LOCAL_VERSION_FILE="${OTA_VERSION_FILE:-${TARGET_DIR}/client.version}"

# Determine manifest and update URLs
if [ -n "${SLOWDASH_PUBLIC_URL}" ]; then
	MANIFEST_URL="${SLOWDASH_PUBLIC_URL%/}/clients/manifest.json"
	UPDATE_URL="${SLOWDASH_PUBLIC_URL%/}/clients/kindle/update.tar.gz"
else
	MANIFEST_URL="${SLOWDASH_SERVER_URL%/}/clients/manifest.json"
	UPDATE_URL="${SLOWDASH_SERVER_URL%/}/clients/kindle/update.tar.gz"
fi

logger "Checking for OTA updates"

TMPDIR="/tmp/slowdash_ota"
mkdir -p "${TMPDIR}"

# Download manifest with cache busting
TIMESTAMP=$(date +%s)
CACHE_BUSTED_MANIFEST="${MANIFEST_URL}?t=${TIMESTAMP}"
# Fallback to HTTP for old Kindles with TLS issues
CACHE_BUSTED_MANIFEST=$(echo "${CACHE_BUSTED_MANIFEST}" | sed 's|^https://|http://|')

logger "Fetching manifest from ${CACHE_BUSTED_MANIFEST}"
if ! wget --no-check-certificate -q -O "${TMPDIR}/manifest.json" "${CACHE_BUSTED_MANIFEST}"; then
	logger "Failed to download manifest."
	rm -rf "${TMPDIR}"
	exit 1
fi

remote_version=$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "${TMPDIR}/manifest.json" | head -n1 | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
remote_update_url=$(grep -oE '"update_url"[[:space:]]*:[[:space:]]*"[^"]+"' "${TMPDIR}/manifest.json" | head -n1 | sed 's/.*"update_url"[[:space:]]*:[[:space:]]*"\([^\"]*\)".*/\1/')

if [ -z "${remote_version}" ]; then
	logger "Failed to parse manifest version."
	rm -rf "${TMPDIR}"
	exit 1
fi

if [ -z "${remote_update_url}" ]; then
	remote_update_url="${UPDATE_URL}"
fi

local_version=""
if [ -f "${LOCAL_VERSION_FILE}" ]; then
	local_version="$(cat "${LOCAL_VERSION_FILE}")"
fi

logger "Local version: ${local_version:-none}"
logger "Remote version: ${remote_version}"

if [ "${remote_version}" = "${local_version}" ]; then
	logger "Already latest version."
	if [ "${FORCE_RUN}" -eq 1 ]; then
		eips 2 38 "OTA: Already latest version.       " 2>/dev/null || true
		flush_log_buffer force
	fi
	rm -rf "${TMPDIR}"
	exit 0
fi

logger "Downloading update package..."
CACHE_BUSTED_UPDATE="${remote_update_url}?t=${TIMESTAMP}"
# Fallback to HTTP for old Kindles with TLS issues
CACHE_BUSTED_UPDATE=$(echo "${CACHE_BUSTED_UPDATE}" | sed 's|^https://|http://|')
if ! wget --no-check-certificate -q -O "${TMPDIR}/update.tar.gz" "${CACHE_BUSTED_UPDATE}"; then
	logger "Failed to download update package."
	rm -rf "${TMPDIR}"
	exit 1
fi

logger "Extracting update package to ${TARGET_DIR}..."
mkdir -p "${TARGET_DIR}"
tar -xzf "${TMPDIR}/update.tar.gz" -C "${TARGET_DIR}"

echo "${remote_version}" > "${LOCAL_VERSION_FILE}"
logger "OTA update installed: ${remote_version}"
if [ "${FORCE_RUN}" -eq 1 ]; then
	eips 2 38 "OTA update installed!              " 2>/dev/null || true
fi

rm -rf "${TMPDIR}"

if [ "${FORCE_RUN}" -eq 1 ]; then
	flush_log_buffer force
fi
