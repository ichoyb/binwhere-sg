#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import time
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[2]
CONFIG = ROOT / "ops/routing"
parser = argparse.ArgumentParser()
parser.add_argument("work", type=pathlib.Path)
parser.add_argument("output", type=pathlib.Path)
parser.add_argument("--record-baseline", action="store_true")
args = parser.parse_args()
work = args.work.resolve()
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
pins = json.loads((CONFIG / "pins.json").read_text())
source = work / "source/osrm-backend-26.11.0"
engine = work / "engine-build"
threads = os.environ["BUILD_JOBS"]


def run(command, **kwargs):
    print("+", " ".join(map(str, command)), flush=True)
    return subprocess.run(list(map(str, command)), check=True, **kwargs)


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


pbf = work / "downloads" / pathlib.PurePosixPath(urllib.parse.urlparse(pins["osm"]["url"]).path).name
if not pbf.exists():
    run(["curl", "--fail", "--location", "--silent", "--show-error", pins["osm"]["url"], "-o", pbf])
if pbf.stat().st_size != pins["osm"]["bytes"] or sha(pbf) != pins["osm"]["sha256"]:
    raise SystemExit("OSM pin mismatch")
header = json.loads(subprocess.check_output(["osmium", "fileinfo", "--json", pbf]))
profile = work / "profile"
shutil.copytree(source / "profiles", profile, dirs_exist_ok=True)
shutil.copy2(CONFIG / "foot.lua", profile / "foot.lua")
graph = work / "graph"
graph.mkdir(exist_ok=True)
clipped = graph / "singapore.osm.pbf"
started = time.monotonic()
run(["osmium", "extract", "--bbox", ",".join(map(str, pins["osm"]["bbox"])),
     "--strategy=complete_ways", "--overwrite", "-o", clipped, pbf])
crop_seconds = time.monotonic() - started
clipped_sha256 = sha(clipped)
profile_sha256 = sha(CONFIG / "foot.lua")
network_inputs = {"clipped_pbf_sha256": clipped_sha256, "profile_sha256": profile_sha256,
                  "osrm_source_sha256": pins["osrm"]["sha256"]}
road_network_version = hashlib.sha256(json.dumps(network_inputs, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
osm_data_timestamp = header["header"]["option"]["osmosis_replication_timestamp"]
data_version = road_network_version + "@" + osm_data_timestamp
started = time.monotonic()
run([engine / "osrm-extract", "--threads", threads, "--profile", profile / "foot.lua",
     "--data_version", data_version, clipped])
run([engine / "osrm-partition", "--threads", threads, graph / "singapore.osrm"])
run([engine / "osrm-customize", "--threads", threads, graph / "singapore.osrm"])
graph_seconds = time.monotonic() - started
audit = work / "audit-index.json"
with audit.open("w") as destination:
    cat = subprocess.Popen(["osmium", "cat", str(clipped), "-f", "osm"], stdout=subprocess.PIPE)
    run(["python3", CONFIG / "build-audit-index.py"], stdin=cat.stdout, stdout=destination)
    cat.stdout.close()
    if cat.wait() != 0:
        raise SystemExit("osmium audit export failed")

with (output / "quality-server.log").open("w") as log:
    server = subprocess.Popen([str(engine / "osrm-routed"), "--algorithm", "mld", "--threads", threads,
                               "--ip", "127.0.0.1", "--port", "5000", "--verbosity", "WARNING",
                               str(graph / "singapore.osrm")], stdout=log, stderr=log)
    try:
        ready = False
        for _ in range(100):
            probe = subprocess.run(["python3", str(CONFIG / "check-route.py"), "http://127.0.0.1:5000"],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if probe.returncode == 0:
                ready = True
                break
            if server.poll() is not None:
                break
            time.sleep(0.1)
        if not ready:
            raise SystemExit("quality server did not become ready")
        gate = ["python3", CONFIG / "quality-gate.py", "--url", "http://127.0.0.1:5000",
                "--audit-index", audit, "--output", output / "quality.json"]
        if args.record_baseline:
            gate.append("--record-baseline")
        run(gate)
        quality = json.loads((output / "quality.json").read_text())
        assert all(row["response"]["body"]["data_version"] == data_version for row in quality["results"])
    finally:
        server.terminate()
        server.wait()

run(["python3", CONFIG / "negative-control.py", work, output / "negative-control"])

bundle = work / "bundle"
if bundle.exists():
    shutil.rmtree(bundle)
for directory in ("bin", "lib", "data", "licenses", "metadata", "ops"):
    (bundle / directory).mkdir(parents=True)
binary = bundle / "bin/osrm-routed"
shutil.copy2(engine / "osrm-routed", binary)
run(["strip", binary])
linked = subprocess.check_output(["ldd", binary], text=True)
for line in linked.splitlines():
    match = re.search(r"=> (/\S+)", line)
    if not match:
        continue
    library = pathlib.Path(match.group(1))
    if library.name in ("libc.so.6", "libm.so.6", "libpthread.so.0", "libdl.so.2", "librt.so.1"):
        continue
    shutil.copyfile(library, bundle / "lib" / library.name)
for library in (bundle / "lib").iterdir():
    run(["patchelf", "--set-rpath", "$ORIGIN", library])
run(["patchelf", "--set-rpath", "$ORIGIN/../lib", binary])
for path in graph.glob("singapore.osrm*"):
    shutil.copy2(path, bundle / "data" / path.name)
for name in ("pins.json", "foot.lua", "foot.diff", "samples.json", "baseline.json"):
    shutil.copy2(CONFIG / name, bundle / "metadata" / name)
shutil.copy2(CONFIG / "check-route.py", bundle / "ops/check-route.py")
shutil.copy2(source / "LICENSE.TXT", bundle / "licenses/OSRM-BSD-2-Clause.txt")
shutil.copy2(CONFIG / "OSM-NOTICE.txt", bundle / "licenses/OSM-NOTICE.txt")
shutil.copy2(CONFIG / "ODbL-1.0.txt", bundle / "licenses/ODbL-1.0.txt")
vcpkg = work / "source/vcpkg/installed/x64-linux-release/share"
for copyright_file in sorted(vcpkg.glob("*/copyright")):
    target = bundle / "licenses/dependencies" / copyright_file.parent.name
    target.mkdir(parents=True)
    shutil.copy2(copyright_file, target / "copyright")
for name in ("libgcc-s1", "libstdc++6"):
    shutil.copytree(pathlib.Path("/usr/share/doc") / name, bundle / "licenses/system" / name, symlinks=False)
shutil.copy2("/usr/share/common-licenses/GPL-3", bundle / "licenses/system/GPL-3.txt")
files = {str(path.relative_to(bundle)): sha(path) for path in sorted(bundle.rglob("*")) if path.is_file()}
manifest = {"schema": 1, "architecture": "x86_64", "os": "ubuntu-24.04", "pins": pins,
            "pbf_header": header["header"], "clipped_sha256": clipped_sha256,
            "profile_sha256": profile_sha256, "road_network_version": road_network_version,
            "osm_data_timestamp": osm_data_timestamp, "data_version": data_version, "files": files}
manifest_bytes = (json.dumps(manifest, sort_keys=True, separators=(",", ":")) + "\n").encode()
release_id = hashlib.sha256(manifest_bytes).hexdigest()
(bundle / "manifest.json").write_bytes(manifest_bytes)
archive = output / "binwhere-routing.tar.gz"
run(["tar", "--sort=name", "--mtime=@0", "--owner=0", "--group=0", "--numeric-owner",
     "-czf", archive, "-C", bundle, "."])
release = {"release_id": release_id, "archive_sha256": sha(archive), "architecture": "x86_64",
           "archive_bytes": archive.stat().st_size, "unpacked_bytes": sum(p.stat().st_size for p in bundle.rglob("*") if p.is_file()),
           "graph_bytes": sum(p.stat().st_size for p in (bundle / "data").iterdir()),
           "crop_seconds": crop_seconds, "graph_seconds": graph_seconds}
(output / "release.json").write_text(json.dumps(release, indent=2) + "\n")
print(json.dumps(release, indent=2))
