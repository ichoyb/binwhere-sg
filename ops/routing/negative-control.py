#!/usr/bin/env python3
import json
import os
import pathlib
import shutil
import subprocess
import sys
import time

config = pathlib.Path(__file__).resolve().parent
work = pathlib.Path(sys.argv[1]).resolve()
output = pathlib.Path(sys.argv[2]).resolve()
output.mkdir(parents=True, exist_ok=True)
graph = work / "negative-control"
graph.mkdir(exist_ok=True)
shutil.copy2(work / "graph/singapore.osm.pbf", graph / "singapore.osm.pbf")
engine = work / "engine-build"
threads = os.environ["BUILD_JOBS"]
for invocation in (
    [engine / "osrm-extract", "--threads", threads, "--profile", work / "source/osrm-backend-26.11.0/profiles/foot.lua", graph / "singapore.osm.pbf"],
    [engine / "osrm-partition", "--threads", threads, graph / "singapore.osrm"],
    [engine / "osrm-customize", "--threads", threads, graph / "singapore.osrm"],
):
    print("+", " ".join(map(str, invocation)), flush=True)
    subprocess.run(list(map(str, invocation)), check=True)
with (output / "server.log").open("w") as log:
    server = subprocess.Popen([str(engine / "osrm-routed"), "--algorithm", "mld", "--threads", threads,
                               "--ip", "127.0.0.1", "--port", "5000", "--verbosity", "WARNING",
                               str(graph / "singapore.osrm")], stdout=log, stderr=log)
    try:
        ready = False
        for _ in range(100):
            probe = subprocess.run(["python3", str(config / "check-route.py"), "http://127.0.0.1:5000"],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if probe.returncode == 0:
                ready = True
                break
            if server.poll() is not None:
                break
            time.sleep(0.1)
        if not ready:
            raise SystemExit("negative-control server did not become ready")
        report_path = output / "quality.json"
        report_path.unlink(missing_ok=True)
        result = subprocess.run(["python3", str(config / "quality-gate.py"), "--url", "http://127.0.0.1:5000",
                                 "--audit-index", str(work / "audit-index.json"), "--output", str(report_path)])
        report = json.loads(report_path.read_text())
        assert result.returncode != 0 and not report["no_ferry"]
        assert report["ferry"]["http"] == 200 and report["ferry"]["body"]["code"] == "Ok"
        samples = {row["id"]: row for row in report["results"]}
        for sample_id in ("03", "06"):
            assert any(hit["tags"].get("highway") == "service" and
                       (hit["tags"].get("tunnel") == "yes" or float(hit["tags"].get("layer", "0")) < 0)
                       for hit in samples[sample_id]["forbidden_ways"]), sample_id
        print("negative control confirmed: ferry and both underground-service samples fail", flush=True)
    finally:
        server.terminate()
        server.wait()
