#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

readonly ARCHIVE="${1:-}"
readonly EXPECTED_SHA256="${2:-}"
readonly RELEASE_ID="${3:-}"
readonly EXPECTED_ARCH="${4:-}"
readonly BASE=/opt/binwhere-routing
readonly RELEASES="${BASE}/releases"
readonly CURRENT="${BASE}/current"
readonly SERVICE=binwhere-routing.service
readonly PREFLIGHT=binwhere-routing-preflight.service
PREVIOUS=""
STAGING=""
TEMP_LINK=""

die() {
  printf 'routing deploy failed: %s\n' "$*" >&2
  exit 1
}

[[ "${EUID}" -eq 0 ]] || die 'must run as root'
[[ "${ARCHIVE}" == /* && -f "${ARCHIVE}" ]] || die 'archive must be an existing absolute path'
[[ "${EXPECTED_SHA256}" =~ ^[0-9a-f]{64}$ ]] || die 'invalid archive SHA256'
[[ "${RELEASE_ID}" =~ ^[0-9a-f]{64}$ ]] || die 'invalid manifest id'
[[ "${EXPECTED_ARCH}" == x86_64 && "$(uname -m)" == x86_64 ]] || die 'requires x86_64 host and artifact'
for command in awk chmod chown df id journalctl ln mkdir mv python3 readlink rm sha256sum sleep stat systemctl systemd-run tar; do
  command -v "${command}" >/dev/null || die "missing command: ${command}"
done
id binwhere-routing >/dev/null 2>&1 || die 'missing binwhere-routing user'
[[ -d "${RELEASES}" && "$(stat -c '%U:%G:%a' "${RELEASES}")" == root:binwhere-routing:750 ]] \
  || die 'releases directory must exist with root:binwhere-routing 0750'
[[ -f /etc/systemd/system/binwhere-routing.service ]] || die 'routing unit must be installed first'
[[ "$(sha256sum "${ARCHIVE}" | awk '{print $1}')" == "${EXPECTED_SHA256}" ]] || die 'archive checksum mismatch'

REQUIRED_BYTES="$(python3 - "${ARCHIVE}" "${RELEASE_ID}" "${EXPECTED_ARCH}" <<'PY'
import hashlib, json, pathlib, sys, tarfile
with tarfile.open(sys.argv[1], 'r:gz') as archive:
    size = 0
    for member in archive.getmembers():
        path = pathlib.PurePosixPath(member.name)
        if path.is_absolute() or '..' in path.parts or not (member.isfile() or member.isdir()):
            raise SystemExit('unsafe archive member: ' + member.name)
        size += member.size
    manifest = archive.extractfile('./manifest.json').read()
    if hashlib.sha256(manifest).hexdigest() != sys.argv[2]:
        raise SystemExit('manifest id mismatch')
    if json.loads(manifest)['architecture'] != sys.argv[3]:
        raise SystemExit('manifest architecture mismatch')
    print(size + 64 * 1024 * 1024)
PY
)" || die 'archive validation failed'
readonly REQUIRED_BYTES
[[ "${REQUIRED_BYTES}" =~ ^[0-9]+$ ]] || die 'invalid unpacked size'
readonly FREE_BYTES="$(df -PB1 "${RELEASES}" | awk 'NR==2 {print $4}')"
(( FREE_BYTES >= REQUIRED_BYTES )) || die "insufficient disk: need ${REQUIRED_BYTES}, available ${FREE_BYTES} bytes"
readonly RELEASE="${RELEASES}/${RELEASE_ID}"
[[ ! -e "${RELEASE}" ]] || die 'release already installed; use the documented rollback procedure'
if [[ -L "${CURRENT}" ]]; then
  PREVIOUS="$(readlink -e "${CURRENT}")" || die 'broken current link'
  [[ "${PREVIOUS}" == "${RELEASES}/"* && -x "${PREVIOUS}/bin/osrm-routed" ]] || die 'invalid current release'
elif [[ -e "${CURRENT}" ]]; then
  die 'current must be a symlink'
fi

cleanup() {
  systemctl stop "${PREFLIGHT}" >/dev/null 2>&1 || true
  [[ -z "${STAGING}" ]] || rm -rf -- "${STAGING}"
  [[ -z "${TEMP_LINK}" ]] || rm -f -- "${TEMP_LINK}"
}
trap cleanup EXIT

verify_route() {
  local release="$1" port="$2" unit="$3"
  for _ in {1..30}; do
    if systemctl is-active --quiet "${unit}" \
      && python3 "${release}/ops/check-route.py" "http://127.0.0.1:${port}"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

activate() {
  TEMP_LINK="${BASE}/.current-${RELEASE_ID}"
  ln -s "${1}" "${TEMP_LINK}"
  mv -Tf "${TEMP_LINK}" "${CURRENT}"
  TEMP_LINK=""
}

rollback() {
  journalctl -u "${SERVICE}" -n 50 --no-pager >&2 || true
  if [[ -n "${PREVIOUS}" ]]; then
    activate "${PREVIOUS}"
    if systemctl restart "${SERVICE}" && verify_route "${PREVIOUS}" 5000 "${SERVICE}"; then
      die "new release failed; rolled back and verified ${PREVIOUS##*/}"
    fi
    die "new release failed; rollback verification failed for ${PREVIOUS##*/}"
  fi
  systemctl stop "${SERVICE}" || true
  rm -f -- "${CURRENT}"
  die 'new release failed; no previous release, service stopped'
}

STAGING="${RELEASES}/.${RELEASE_ID}.staging"
mkdir -m 0750 "${STAGING}"
tar -xzf "${ARCHIVE}" -C "${STAGING}" --no-same-owner --no-same-permissions
chown -R root:binwhere-routing "${STAGING}"
chmod -R u=rwX,g=rX,o= "${STAGING}"
[[ -x "${STAGING}/bin/osrm-routed" && -f "${STAGING}/data/singapore.osrm.mldgr" \
  && -f "${STAGING}/ops/check-route.py" ]] || die 'incomplete routing package'
mv "${STAGING}" "${RELEASE}"
STAGING=""
systemd-run --unit="${PREFLIGHT}" --collect \
  --property=User=binwhere-routing --property=Group=binwhere-routing \
  --property=MemoryMax=1G --property=NoNewPrivileges=yes \
  --property=ProtectSystem=strict --property=ProtectHome=yes --property=PrivateTmp=yes \
  --property=IPAddressDeny=any --property=IPAddressAllow=localhost \
  "${RELEASE}/bin/osrm-routed" --algorithm mld --threads 2 --ip 127.0.0.1 --port 5001 \
  --verbosity WARNING "${RELEASE}/data/singapore.osrm"
verify_route "${RELEASE}" 5001 "${PREFLIGHT}" || die 'preflight route failed; current unchanged'
systemctl stop "${PREFLIGHT}"
activate "${RELEASE}"
if ! systemctl restart "${SERVICE}" || ! verify_route "${RELEASE}" 5000 "${SERVICE}"; then
  rollback
fi
printf 'deployed routing release %s\n' "${RELEASE_ID}"
