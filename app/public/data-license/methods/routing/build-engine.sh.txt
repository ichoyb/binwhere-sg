#!/usr/bin/env bash
set -Eeuo pipefail

readonly ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly WORK="$(realpath -m "${1:?usage: build-engine.sh WORK}")"
readonly JOBS="${BUILD_JOBS:-$(nproc)}"
[[ "$(uname -m)" == x86_64 ]]
mkdir -p "${WORK}/downloads" "${WORK}/source" "${WORK}/vcpkg-cache"

python3 - "${ROOT}/ops/routing/pins.json" "${WORK}/downloads" <<'PY'
import hashlib, json, pathlib, subprocess, sys
pins = json.loads(pathlib.Path(sys.argv[1]).read_text())
for name, filename in [('osrm', 'osrm-v26.11.0.tar.gz'), ('vcpkg', 'vcpkg.tar.gz')]:
    pin = pins[name]
    target = pathlib.Path(sys.argv[2]) / filename
    if not target.exists():
        subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error', pin['url'], '-o', str(target)], check=True)
    if hashlib.sha256(target.read_bytes()).hexdigest() != pin['sha256']:
        raise SystemExit(f'{name}: source checksum mismatch')
PY

tar -xzf "${WORK}/downloads/osrm-v26.11.0.tar.gz" -C "${WORK}/source"
mkdir -p "${WORK}/source/vcpkg"
tar -xzf "${WORK}/downloads/vcpkg.tar.gz" --strip-components=1 -C "${WORK}/source/vcpkg"
readonly SOURCE="${WORK}/source/osrm-backend-26.11.0"
export VCPKG_ROOT="${WORK}/source/vcpkg"
export VCPKG_DEFAULT_BINARY_CACHE="${WORK}/vcpkg-cache"
export VCPKG_MAX_CONCURRENCY="${JOBS}"
python3 - "${ROOT}/ops/routing" "${VCPKG_ROOT}" <<'PY'
import hashlib, json, pathlib, sys
config, vcpkg = map(pathlib.Path, sys.argv[1:])
pin = json.loads((config / 'pins.json').read_text())['boost_math_overlay']
for directory, expected in [
    (vcpkg / 'ports/boost-math', pin['upstream_port_sha256']),
    (config / 'overlay-ports/boost-math', pin['files_sha256']),
]:
    actual = {str(path.relative_to(directory)): hashlib.sha256(path.read_bytes()).hexdigest()
              for path in directory.rglob('*') if path.is_file()}
    if actual != expected:
        raise SystemExit(f'{directory}: boost-math port checksum mismatch; re-derive the overlay from the pinned vcpkg baseline')
PY
"${VCPKG_ROOT}/bootstrap-vcpkg.sh" -disableMetrics
mapfile -t dependencies < <(python3 -c 'import json,sys; print("\n".join(json.load(open(sys.argv[1]))["dependencies"]))' "${SOURCE}/vcpkg.json")
"${VCPKG_ROOT}/vcpkg" install --classic \
  --triplet=x64-linux-release \
  --host-triplet=x64-linux-release \
  --overlay-triplets="${ROOT}/ops/routing" \
  --overlay-ports="${ROOT}/ops/routing/overlay-ports" \
  --overlay-ports="${SOURCE}/vcpkg-overlay-ports" \
  "${dependencies[@]}"
/opt/cmake/bin/cmake -S "${SOURCE}" -B "${WORK}/engine-build" -G Ninja \
  -DCMAKE_TOOLCHAIN_FILE="${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" \
  -DVCPKG_MANIFEST_MODE=OFF -DVCPKG_TARGET_TRIPLET=x64-linux-release -DVCPKG_HOST_TRIPLET=x64-linux-release \
  -DVCPKG_OVERLAY_TRIPLETS="${ROOT}/ops/routing" \
  -DCMAKE_BUILD_TYPE=Release -DENABLE_LTO=OFF
/opt/cmake/bin/cmake --build "${WORK}/engine-build" --parallel "${JOBS}" \
  --target osrm-extract osrm-partition osrm-customize osrm-routed
