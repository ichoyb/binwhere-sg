#!/usr/bin/env bash
set -Eeuo pipefail
readonly ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly WORK="$(realpath -m "${1:?usage: build-release.sh WORK OUTPUT [--record-baseline]}")"
readonly OUTPUT="$(realpath -m "${2:?missing OUTPUT}")"
export BUILD_JOBS="${BUILD_JOBS:-$(nproc)}"
printf 'BUILD_JOBS=%s\n' "${BUILD_JOBS}"
bash "${ROOT}/ops/routing/build-engine.sh" "${WORK}"
python3 "${ROOT}/ops/routing/build-release.py" "${WORK}" "${OUTPUT}" "${@:3}"
