#!/usr/bin/env bash

set -Eeuo pipefail
umask 027

readonly ARTIFACT_URI="${1:-}"
readonly EXPECTED_SHA256="${2:-}"
readonly RELEASE_ID="${3:-}"
readonly EXPECTED_ARCH="${4:-}"
readonly RELEASES_DIR="/opt/binwhere/releases"
readonly CURRENT_LINK="/opt/binwhere/current"
readonly SERVICE_NAME="binwhere.service"

die() {
  printf 'deploy failed: %s\n' "$*" >&2
  exit 1
}

[[ "${EUID}" -eq 0 ]] || die 'must run as root'
[[ "${ARTIFACT_URI}" =~ ^s3://[a-z0-9][a-z0-9.-]+/releases/ ]] || die 'invalid artifact URI'
[[ "${EXPECTED_SHA256}" =~ ^[0-9a-f]{64}$ ]] || die 'invalid artifact checksum'
[[ "${RELEASE_ID}" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || die 'invalid release id'
[[ "${EXPECTED_ARCH}" == 'x86_64' || "${EXPECTED_ARCH}" == 'aarch64' ]] || die 'invalid architecture'

for command in \
  awk aws chmod chown curl find grep id install journalctl ln mktemp mv node \
  readlink rm sha256sum sleep stat systemctl tar uname; do
  command -v "${command}" >/dev/null || die "missing command: ${command}"
done

readonly ACTUAL_ARCH="$(uname -m)"
[[ "${ACTUAL_ARCH}" == "${EXPECTED_ARCH}" ]] || {
  die "artifact architecture ${EXPECTED_ARCH} does not match host ${ACTUAL_ARCH}"
}

readonly NODE_VERSION="$(node --version)"
[[ "${NODE_VERSION}" == v24.* ]] || die "Node 24 is required; found ${NODE_VERSION}"

case "${EXPECTED_ARCH}:$(node -p 'process.arch')" in
  x86_64:x64 | aarch64:arm64) ;;
  *) die 'Node executable architecture does not match the host' ;;
esac

id binwhere >/dev/null 2>&1 || die 'missing binwhere system user'
readonly ENV_FILE="/etc/binwhere/env"
[[ -f "${ENV_FILE}" ]] || die "missing ${ENV_FILE}"
[[ ! -L "${ENV_FILE}" ]] || die "${ENV_FILE} must not be a symlink"
[[ "$(stat -c '%U:%G:%a' "${ENV_FILE}")" == 'root:binwhere:640' ]] \
  || die "${ENV_FILE} must be owned by root:binwhere with mode 0640"
[[ "$(grep -Ec '^[A-Za-z_][A-Za-z0-9_]*=' "${ENV_FILE}")" -eq 1 ]] \
  || die "${ENV_FILE} must contain exactly one variable assignment"
grep -Eq '^TOKENHUB_API_KEY=[^[:space:]]+$' "${ENV_FILE}" \
  || die 'TOKENHUB_API_KEY must be present and non-empty'

install -d -o root -g binwhere -m 0750 "${RELEASES_DIR}"
readonly WORK_DIR="$(mktemp -d /var/tmp/binwhere-deploy.XXXXXX)"
STAGING_DIR=""
CURRENT_TEMP_LINK=""
PREVIOUS_RELEASE=""

cleanup() {
  rm -rf -- "${WORK_DIR}"
  if [[ -n "${STAGING_DIR}" && "${STAGING_DIR}" == "${RELEASES_DIR}/."* ]]; then
    rm -rf -- "${STAGING_DIR}"
  fi
  [[ -z "${CURRENT_TEMP_LINK}" ]] || rm -f -- "${CURRENT_TEMP_LINK}"
}
trap cleanup EXIT

wait_for_server() {
  for _ in {1..30}; do
    if systemctl is-active --quiet "${SERVICE_NAME}" \
      && curl --fail --silent --max-time 2 \
        http://127.0.0.1:3100/robots.txt >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

verify_application() {
  local response

  response="$(curl --fail --silent --max-time 5 \
    'http://127.0.0.1:3100/api/v1/nearby?lat=1.37&lng=103.85&channel=blue_bin&limit=1' \
    --header 'CF-Connecting-IP: 192.0.2.1')" || return 1

  grep -Eq '"channel":"blue_bin"' <<<"${response}" \
    && grep -Eq '"count":[0-9]+' <<<"${response}"
}

verify_release() {
  wait_for_server && verify_application
}

activate_release() {
  local target="$1"
  local operation="$2"

  CURRENT_TEMP_LINK="/opt/binwhere/.current-${RELEASE_ID}-${operation}"
  [[ ! -e "${CURRENT_TEMP_LINK}" && ! -L "${CURRENT_TEMP_LINK}" ]] \
    || die "temporary current link already exists: ${CURRENT_TEMP_LINK}"
  ln -s "${target}" "${CURRENT_TEMP_LINK}"
  mv -Tf "${CURRENT_TEMP_LINK}" "${CURRENT_LINK}"
  CURRENT_TEMP_LINK=""
}

rollback_failed_release() {
  local failure="$1"

  journalctl -u "${SERVICE_NAME}" -n 50 --no-pager >&2 || true

  if [[ -n "${PREVIOUS_RELEASE}" ]]; then
    activate_release "${PREVIOUS_RELEASE}" rollback
    if systemctl restart "${SERVICE_NAME}" && verify_release; then
      die "${failure}; rolled back to ${PREVIOUS_RELEASE##*/}"
    fi

    journalctl -u "${SERVICE_NAME}" -n 50 --no-pager >&2 || true
    die "${failure}; rollback to ${PREVIOUS_RELEASE##*/} did not recover the service"
  fi

  systemctl stop "${SERVICE_NAME}" >/dev/null 2>&1 || true
  if [[ -L "${CURRENT_LINK}" ]]; then
    rm -f -- "${CURRENT_LINK}"
  fi
  die "${failure}; no previous release exists, so the service was stopped"
}

readonly ARCHIVE="${WORK_DIR}/binwhere-web.tar.gz"
aws s3 cp "${ARTIFACT_URI}" "${ARCHIVE}" --only-show-errors

readonly ACTUAL_SHA256="$(sha256sum "${ARCHIVE}" | awk '{print $1}')"
[[ "${ACTUAL_SHA256}" == "${EXPECTED_SHA256}" ]] || die 'artifact checksum mismatch'

while IFS= read -r archive_path; do
  case "${archive_path}" in
    /* | ../* | */../* | */..) die "unsafe archive path: ${archive_path}" ;;
  esac
done < <(tar -tzf "${ARCHIVE}")

readonly RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
[[ ! -e "${RELEASE_DIR}" ]] || die "release already exists: ${RELEASE_ID}"

STAGING_DIR="${RELEASES_DIR}/.${RELEASE_ID}.staging"
[[ ! -e "${STAGING_DIR}" ]] || die "staging directory already exists: ${STAGING_DIR}"
install -d -o root -g binwhere -m 0750 "${STAGING_DIR}"
tar -xzf "${ARCHIVE}" -C "${STAGING_DIR}" --no-same-owner --no-same-permissions

[[ -f "${STAGING_DIR}/app/server.js" ]] || die 'artifact is missing app/server.js'
[[ -d "${STAGING_DIR}/app/public" ]] || die 'artifact is missing app/public'
[[ -d "${STAGING_DIR}/app/.next/static" ]] || die 'artifact is missing app/.next/static'

readonly FORBIDDEN_PATH="$({
  find "${STAGING_DIR}" \
    \( -name '.env' -o -name '.env.*' -o -name '.git' -o -name 'mobile' \
       -o -name '*.pem' -o -name '*.key' -o -name '*.p8' -o -name '*.p12' \) \
    -print -quit
} || true)"
[[ -z "${FORBIDDEN_PATH}" ]] || die "forbidden path in artifact: ${FORBIDDEN_PATH}"

readonly SPECIAL_PATH="$({
  find "${STAGING_DIR}" ! -type d ! -type f ! -type l -print -quit
} || true)"
[[ -z "${SPECIAL_PATH}" ]] || die "unsupported special file in artifact: ${SPECIAL_PATH}"

while IFS= read -r -d '' symlink_path; do
  resolved_path="$(readlink -m "${symlink_path}")"
  [[ "${resolved_path}" == "${STAGING_DIR}"/* ]] || die "symlink escapes release: ${symlink_path}"
done < <(find "${STAGING_DIR}" -type l -print0)

chown -hR root:binwhere "${STAGING_DIR}"
find "${STAGING_DIR}" -type d -exec chmod 0750 {} +
find "${STAGING_DIR}" -type f -exec chmod 0640 {} +
printf '%s\n' "${ACTUAL_SHA256}" >"${STAGING_DIR}/.artifact-sha256"
chmod 0640 "${STAGING_DIR}/.artifact-sha256"
chown root:binwhere "${STAGING_DIR}/.artifact-sha256"

mv "${STAGING_DIR}" "${RELEASE_DIR}"
STAGING_DIR=""

if [[ -e "${CURRENT_LINK}" && ! -L "${CURRENT_LINK}" ]]; then
  die "${CURRENT_LINK} exists but is not a symlink"
fi

if [[ -L "${CURRENT_LINK}" ]]; then
  current_target="$(readlink -f "${CURRENT_LINK}")" \
    || die 'current symlink is broken'
  [[ "${current_target}" == "${RELEASES_DIR}"/* ]] || die 'current symlink points outside releases'
  [[ -f "${current_target}/app/server.js" ]] || die 'current release is missing app/server.js'
  PREVIOUS_RELEASE="${current_target}"
fi

activate_release "${RELEASE_DIR}" activate

if ! systemctl restart "${SERVICE_NAME}"; then
  rollback_failed_release 'systemd restart failed'
fi

if ! verify_release; then
  rollback_failed_release 'release failed the local application health check'
fi

printf 'deployed release %s (%s, Node %s)\n' \
  "${RELEASE_ID}" "${ACTUAL_ARCH}" "${NODE_VERSION}"
