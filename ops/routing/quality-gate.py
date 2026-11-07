#!/usr/bin/env python3
import argparse
import hashlib
import json
import math
import pathlib
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument("--url", required=True)
parser.add_argument("--audit-index", type=pathlib.Path, required=True)
parser.add_argument("--baseline", type=pathlib.Path, default=ROOT / "baseline.json")
parser.add_argument("--record-baseline", action="store_true")
parser.add_argument("--output", type=pathlib.Path, required=True)
args = parser.parse_args()
samples = json.loads((ROOT / "samples.json").read_text())
index = {}
for a, b, way_id, tags in json.loads(args.audit_index.read_text())["edges"]:
    index.setdefault(tuple(sorted((a, b))), []).append({"way_id": way_id, "tags": tags})


def request(pair):
    body = json.dumps({"coordinates": [pair["origin"], pair["destination"]], "radiuses": [50, 50],
                       "overview": "full", "geometries": "geojson", "steps": False,
                       "annotations": ["nodes"], "alternatives": False}).encode()
    req = urllib.request.Request(args.url + "/route/v1/foot", body, {"Content-Type": "application/json"})
    try:
        response = urllib.request.urlopen(req, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return {"http": response.status, "body": json.load(response)}


def meters(a, b):
    x = math.radians(a[0] - b[0]) * math.cos(math.radians((a[1] + b[1]) / 2))
    y = math.radians(a[1] - b[1])
    return math.hypot(x, y) * 6371008.8


baseline = None if args.record_baseline else json.loads(args.baseline.read_text())
if baseline is not None:
    for name, filename in (("pins_sha256", "pins.json"), ("profile_sha256", "foot.lua"), ("samples_sha256", "samples.json")):
        if baseline[name] != hashlib.sha256((ROOT / filename).read_bytes()).hexdigest():
            raise SystemExit("baseline input mismatch: " + filename)
results = []
failures = []
recorded = {}
ferry = request(samples["ferry"])
ferry_ok = ferry["http"] == 400 and ferry["body"].get("code") == "NoRoute"
if not ferry_ok:
    failures.append("no-ferry: Ang Mo Kio to Pulau Ubin must return NoRoute")
for pair in samples["pairs"]:
    response = request(pair)
    result = {"id": pair["id"], "response": response}
    results.append(result)
    if response["http"] != 200 or response["body"].get("code") != "Ok":
        failures.append(pair["id"] + ": route unavailable")
        continue
    route = response["body"]["routes"][0]
    hits = {}
    for leg in route["legs"]:
        nodes = leg["annotation"]["nodes"]
        for a, b in zip(nodes, nodes[1:]):
            for hit in index.get(tuple(sorted((a, b))), []):
                hits[hit["way_id"]] = hit
    result["forbidden_ways"] = list(hits.values())
    if hits:
        failures.append(pair["id"] + ": forbidden OSM ways " + ",".join(map(str, sorted(hits))))
    current = {"distance_m": route["distance"], "coordinates": route["geometry"]["coordinates"]}
    recorded[pair["id"]] = current
    if baseline is not None:
        expected = baseline["routes"][pair["id"]]
        delta = abs(current["distance_m"] - expected["distance_m"])
        geometry = current["coordinates"]
        expected_geometry = expected["coordinates"]
        geometry_ok = len(geometry) == len(expected_geometry) and all(
            meters(a, b) <= baseline["tolerance"]["vertex_m"] for a, b in zip(geometry, expected_geometry))
        result["baseline"] = {"distance_delta_m": delta, "geometry_matches": geometry_ok}
        if delta > baseline["tolerance"]["distance_m"] or not geometry_ok:
            failures.append(pair["id"] + ": baseline distance/geometry mismatch")
report = {"no_ferry": ferry_ok, "ferry": ferry, "results": results, "failures": failures}
args.output.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"no_ferry": ferry_ok, "samples": len(results), "failures": failures}, indent=2))
if failures:
    sys.exit(1)
if args.record_baseline:
    manifest = {"schema": 1, "pins_sha256": hashlib.sha256((ROOT / "pins.json").read_bytes()).hexdigest(),
                "profile_sha256": hashlib.sha256((ROOT / "foot.lua").read_bytes()).hexdigest(),
                "samples_sha256": hashlib.sha256((ROOT / "samples.json").read_bytes()).hexdigest(),
                "tolerance": {"distance_m": 0.1, "vertex_m": 0.15}, "routes": recorded}
    args.baseline.write_text(json.dumps(manifest, indent=2) + "\n")
