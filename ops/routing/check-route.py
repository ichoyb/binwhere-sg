#!/usr/bin/env python3
import json
import sys
import urllib.request

request = urllib.request.Request(
    sys.argv[1] + "/route/v1/foot",
    json.dumps({"coordinates": [[103.8454, 1.3691], [103.844373, 1.367978]],
                "radiuses": [50, 50], "overview": "full", "geometries": "geojson"}).encode(),
    {"Content-Type": "application/json"},
)
with urllib.request.urlopen(request, timeout=2) as response:
    body = json.load(response)
route = body["routes"][0]
assert body["code"] == "Ok"
assert 300 < route["distance"] < 380
assert route["geometry"]["type"] == "LineString" and len(route["geometry"]["coordinates"]) >= 2
print(json.dumps({"code": body["code"], "distance_m": route["distance"]}))
