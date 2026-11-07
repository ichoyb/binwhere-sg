#!/usr/bin/env python3
import json
import sys
import xml.etree.ElementTree as ET

edges = []
context = ET.iterparse(sys.stdin.buffer, events=("start", "end"))
_, root = next(context)
for event, element in context:
    if event != "end":
        continue
    if element.tag == "way":
        tags = {tag.attrib["k"]: tag.attrib["v"] for tag in element.findall("tag")}
        try:
            layer = float(tags.get("layer", "0"))
        except ValueError:
            layer = 0
        underground = tags.get("highway") == "service" and (layer < 0 or tags.get("tunnel") == "yes")
        if underground or tags.get("route") == "ferry":
            nodes = [int(node.attrib["ref"]) for node in element.findall("nd")]
            for a, b in zip(nodes, nodes[1:]):
                edges.append([a, b, int(element.attrib["id"]), tags])
        root.clear()
    elif element.tag in ("node", "relation"):
        root.clear()
json.dump({"edges": edges}, sys.stdout, separators=(",", ":"))
print()
