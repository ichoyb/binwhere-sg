import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
from importlib.metadata import version
import json
import math
from pathlib import Path
import shutil
import struct
import subprocess
import sys
from urllib.parse import quote
from urllib.request import urlopen
import zlib
import zipfile

import osmium
from mapbox_vector_tile.Mapbox import vector_tile_pb2
from pmtiles.reader import MmapSource, Reader, all_tiles
from pmtiles.tile import tileid_to_zxy, zxy_to_tileid
from pmtiles.writer import Writer
from shapely.geometry import LineString, Point, box, mapping
from shapely.ops import polygonize, unary_union


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch(url, path, sha256):
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        with urlopen(url) as response, path.open('wb') as output:
            shutil.copyfileobj(response, output)
    if digest(path) != sha256:
        raise ValueError(f'SHA256 mismatch: {path}')
    return path


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n')


def write_archive(path, tiles, header, metadata, cli):
    tiles = sorted(tiles)
    header = {**header, 'center_zoom': tileid_to_zxy(tiles[0][0])[0]}
    with path.open('wb') as output:
        writer = Writer(output)
        for tile_id, data in tiles:
            writer.write_tile(tile_id, data)
        writer.finalize(header, metadata)
    subprocess.run([str(cli), 'verify', str(path)], check=True)


def extract_osm(path, relation_id):
    class Relation(osmium.SimpleHandler):
        def relation(self, relation):
            if relation.id == relation_id:
                self.members = [(m.ref, m.role) for m in relation.members if m.type == 'w']
                self.version = relation.version

    relation = Relation()
    relation.apply_file(str(path))
    way_ids = {ref for ref, role in relation.members}

    class Ways(osmium.SimpleHandler):
        def __init__(self):
            super().__init__()
            self.refs = {}

        def way(self, way):
            if way.id in way_ids:
                self.refs[way.id] = [n.ref for n in way.nodes]

    ways = Ways()
    ways.apply_file(str(path))
    node_ids = {ref for refs in ways.refs.values() for ref in refs}

    class Nodes(osmium.SimpleHandler):
        def __init__(self):
            super().__init__()
            self.coords = {}
            self.trees = []

        def node(self, node):
            coord = (node.location.lon, node.location.lat)
            if node.id in node_ids:
                self.coords[node.id] = coord
            if node.tags.get('natural') == 'tree':
                self.trees.append(coord)

    nodes = Nodes()
    nodes.apply_file(str(path))
    geometry = {}
    for role in ('outer', 'inner'):
        lines = [LineString([nodes.coords[n] for n in ways.refs[ref]])
                 for ref, r in relation.members if r == role]
        geometry[role] = unary_union(list(polygonize(lines)))
    country = geometry['outer'].difference(geometry['inner'])
    country = country.normalize()
    trees = sorted(p for p in nodes.trees if country.covers(Point(p)))
    return country, trees, relation.version


def tile_bounds(z, x, y):
    n = 2 ** z
    latitude = lambda row: math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * row / n))))
    return box(x / n * 360 - 180, latitude(y + 1), (x + 1) / n * 360 - 180, latitude(y))


def prune_tile(original, config, characters, counts):
    tile = vector_tile_pb2.tile()
    for layer in original.layers:
        rule = config[layer.name]
        result = tile.layers.add(name=layer.name, version=layer.version, extent=layer.extent)
        keys, values = {}, {}
        for feature in layer.features:
            if feature.type != rule['type']:
                continue
            props = {layer.keys[feature.tags[i]]: layer.values[feature.tags[i + 1]]
                     for i in range(0, len(feature.tags), 2)}
            if 'kinds' in rule and props['kind'].string_value not in rule['kinds']:
                continue
            out = result.features.add(type=feature.type)
            out.geometry.extend(feature.geometry)
            for key in rule['properties']:
                if key not in props:
                    continue
                if key not in keys:
                    keys[key] = len(result.keys)
                    result.keys.append(key)
                value = props[key].SerializeToString()
                if value not in values:
                    values[value] = len(result.values)
                    result.values.add().CopyFrom(props[key])
                out.tags.extend((keys[key], values[value]))
            if layer.name == 'roads' and 'name' in props:
                characters.update(props['name'].string_value)
            counts[layer.name] += 1
        if not result.features:
            del tile.layers[-1]
    return gzip.compress(tile.SerializeToString(), mtime=0)


def build_basemap(source, output, work, country, config, cli):
    stages = [[], [], []]
    characters, counts = set(), Counter()
    with source.open('rb') as file:
        reader = Reader(MmapSource(file))
        header = reader.header()
        for (z, x, y), data in all_tiles(reader.get_bytes):
            if z < config['basemap']['minZoom']:
                continue
            tile = vector_tile_pb2.tile()
            tile.ParseFromString(gzip.decompress(data))
            for index in reversed(range(len(tile.layers))):
                if tile.layers[index].name not in config['layers']:
                    del tile.layers[index]
            tile_id = zxy_to_tileid(z, x, y)
            encoded = gzip.compress(tile.SerializeToString(), mtime=0)
            stages[0].append((tile_id, encoded))
            if not country.intersects(tile_bounds(z, x, y)):
                continue
            stages[1].append((tile_id, encoded))
            stages[2].append((tile_id, prune_tile(tile, config['layers'], characters, counts)))
    metadata = {
        'name': 'BinWhere Singapore', 'attribution': '© OpenStreetMap contributors',
        'vector_layers': [{'id': name, 'fields': {p: 'String' if p in ('kind', 'name') else 'Number'
                           for p in rule['properties']}} for name, rule in config['layers'].items()],
    }
    sizes = {'extract': source.stat().st_size}
    for index, name in enumerate(('five_layers_z9', 'singapore_tiles', 'style_features_and_properties')):
        path = output / 'basemap.pmtiles' if index == 2 else work / f'{name}.pmtiles'
        write_archive(path, stages[index], header, metadata, cli)
        sizes[name] = path.stat().st_size
    return characters, dict(counts), sizes


def build_trees(trees, output, header, cli):
    groups = defaultdict(list)
    for lon, lat in trees:
        x = (lon + 180) / 360 * 32768
        y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 32768
        groups[(int(x), int(y))].append((round((x % 1) * 4096), round((y % 1) * 4096)))
    tiles = []
    for (x, y), points in groups.items():
        tile = vector_tile_pb2.tile()
        layer = tile.layers.add(name='trees', version=2, extent=4096)
        for px, py in points:
            layer.features.add(type=1, geometry=[9, px * 2, py * 2])
        tiles.append((zxy_to_tileid(15, x, y), gzip.compress(tile.SerializeToString(), mtime=0)))
    write_archive(output / 'trees.pmtiles', tiles, header, {
        'name': 'Singapore natural=tree', 'attribution': '© OpenStreetMap contributors',
        'vector_layers': [{'id': 'trees', 'fields': {}}],
    }, cli)
    return {'count': len(trees), 'tiles': len(tiles), 'zoom': 15, 'extent': 4096}


def build_sprite(output):
    def chunk(name, data):
        return struct.pack('!I', len(data)) + name + data + struct.pack('!I', zlib.crc32(name + data))

    for scale in (1, 2):
        size = 32 * scale
        width, height = size * 5, size
        raw = bytearray((width * 4 + 1) * height)
        for y in range(height):
            for x in range(width):
                index, px, py = x // size, x % size / scale, y / scale
                if index == 0:
                    lit = (int(px // 8) * 7 + int(py // 8) * 11) % 5 < 2
                    color = (34, 47, 62, 255)
                    if 2 <= px % 8 < 5 and 2 <= py % 8 < 6:
                        color = (255, 213, 135, 255) if lit else (15, 28, 40, 255)
                elif index == 1:
                    radius = math.hypot(px - 15.5, py - 15.5)
                    color = (0, 0, 0, 0)
                    if radius < 12 + 2 * math.sin(math.atan2(py - 15.5, px - 15.5) * 5):
                        shade = int(15 * (1 - radius / 17))
                        color = (24 + shade, 58 + shade, 43 + shade, 240)
                elif index in (2, 3):
                    radius = math.hypot(px - 15.5, py - 15.5)
                    rgb = (69, 171, 255) if index == 2 else (32, 255, 192)
                    alpha = (255 if radius < 5 else 230 if 9 < radius < 11
                             else max(0, int(80 * (1 - radius / 16))))
                    color = (*rgb, alpha)
                else:
                    color = (9, 48, 41, 245) if 1 < px < 31 and 6 < py < 26 else (0, 0, 0, 0)
                    if ((2 < px < 30 and (6 < py < 7 or 25 < py < 26))
                            or (6 < py < 26 and (1 < px < 2 or 30 < px < 31))):
                        color = (62, 182, 133, 255)
                start = y * (width * 4 + 1) + 1 + x * 4
                raw[start:start + 4] = bytes(color)
        png = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB', width, height, 8, 6, 0, 0, 0))
               + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
        suffix = '@2x' if scale == 2 else ''
        (output / f'sprite{suffix}.png').write_bytes(png)
        atlas = {
            name: {'x': index * size, 'y': 0, 'width': size, 'height': size, 'pixelRatio': scale}
            for index, name in enumerate(('windows', 'tree', 'user', 'destination', 'bubble'))
        }
        atlas['bubble'].update({
            'stretchX': [[4 * scale, 28 * scale]], 'stretchY': [[10 * scale, 22 * scale]],
            'content': [4 * scale, 8 * scale, 28 * scale, 24 * scale],
        })
        write_json(output / f'sprite{suffix}.json', atlas)


def pbf_fields(data):
    def varint(offset):
        value, shift = 0, 0
        while True:
            byte = data[offset]
            offset += 1
            value |= (byte & 127) << shift
            if byte < 128:
                return value, offset
            shift += 7

    offset = 0
    while offset < len(data):
        tag, offset = varint(offset)
        wire = tag & 7
        if wire == 2:
            length, offset = varint(offset)
            value = data[offset:offset + length]
            offset += length
        elif wire == 0:
            value, offset = varint(offset)
        else:
            raise ValueError(f'Unexpected glyph wire type {wire}')
        yield tag >> 3, value


def build_glyphs(characters, output, cache, config):
    glyphs = config['glyphs']
    destination = output / 'fonts' / glyphs['fontStack']
    destination.mkdir(parents=True)
    ranges = sorted({ord(c) // 256 * 256 for c in characters})
    coverage = set()
    for start in ranges:
        name = f'{start}-{start + 255}'
        source = fetch(f"{glyphs['baseUrl']}/{quote(glyphs['fontStack'])}/{name}.pbf",
                       cache / f'glyphs-{name}.pbf', glyphs['ranges'][name])
        shutil.copyfile(source, destination / f'{name}.pbf')
        for field, stack in pbf_fields(source.read_bytes()):
            if field == 1:
                for stack_field, glyph in pbf_fields(stack):
                    if stack_field == 3:
                        coverage.update(value for number, value in pbf_fields(glyph) if number == 1)
    missing = sorted(ord(c) for c in characters if ord(c) not in coverage)
    if missing:
        raise ValueError(f'Missing road glyphs: {missing}')
    license_path = fetch(f"{glyphs['baseUrl']}/OFL.txt", cache / 'FONT-LICENSE.txt', glyphs['licenseSha256'])
    shutil.copyfile(license_path, output / 'FONT-LICENSE.txt')
    return {'characters': ''.join(sorted(characters)), 'codepoints': [f'U+{ord(c):04X}' for c in sorted(characters)],
            'ranges': [f'{n}-{n + 255}' for n in ranges], 'missing': missing}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--work-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'assets/map-assets')
    parser.add_argument('--basemap-extract', type=Path)
    parser.add_argument('--osm-pbf', type=Path)
    args = parser.parse_args()
    config_path = Path(__file__).with_name('map-assets-config.json')
    config = json.loads(config_path.read_text())
    args.work_dir.mkdir(parents=True, exist_ok=True)
    args.output.mkdir(parents=True, exist_ok=True)
    if any(args.output.iterdir()):
        raise ValueError('Output directory must be empty')
    archive = fetch(config['extractor']['url'], args.work_dir / 'pmtiles.zip', config['extractor']['sha256'])
    with zipfile.ZipFile(archive) as zip_file:
        zip_file.extract('pmtiles', args.work_dir / 'pmtiles-bin')
    cli = args.work_dir / 'pmtiles-bin/pmtiles'
    cli.chmod(0o755)
    source = args.basemap_extract
    if source is None:
        source = args.work_dir / 'singapore-extract.pmtiles'
        subprocess.run([str(cli), 'extract', config['basemap']['url'], str(source),
                        '--bbox=' + ','.join(str(n) for n in config['basemap']['bbox']),
                        '--maxzoom=15', '--download-threads=4'], check=True)
        subprocess.run([str(cli), 'verify', str(source)], check=True)
    if digest(source) != config['basemap']['extractSha256']:
        raise ValueError('Basemap extract SHA256 mismatch')
    osm = args.osm_pbf or args.work_dir / 'malaysia-singapore-brunei-261101.osm.pbf'
    fetch(config['osm']['url'], osm, config['osm']['sha256'])
    country, trees, relation_version = extract_osm(osm, config['osm']['relation'])
    print(f'OSM trees: {len(trees)}; relation version: {relation_version}', flush=True)
    mask = box(90, -10, 120, 20).difference(country)
    write_json(args.output / 'country-mask.geojson', {'type': 'Feature', 'properties': {}, 'geometry': mapping(mask)})
    characters, counts, sizes = build_basemap(source, args.output, args.work_dir, country, config, cli)
    print(json.dumps({'sizes': sizes, 'characters': ''.join(sorted(characters))}, ensure_ascii=False), flush=True)
    with source.open('rb') as file:
        header = Reader(MmapSource(file)).header()
    tree_stats = build_trees(trees, args.output, header, cli)
    build_sprite(args.output)
    write_json(args.output / 'initial-style.json', {'version': 8, 'sources': {}, 'layers': []})
    coverage = build_glyphs(characters, args.output, args.work_dir, config)
    files = {}
    for path in sorted(args.output.rglob('*')):
        if not path.is_file():
            continue
        name = path.relative_to(args.output).as_posix()
        if name == 'basemap.pmtiles':
            source_info = config['basemap']
        elif name in ('trees.pmtiles', 'country-mask.geojson'):
            source_info = config['osm']
        elif name.startswith('fonts/') or name == 'FONT-LICENSE.txt':
            suffix = f"{quote(config['glyphs']['fontStack'])}/{path.name}" if name.startswith('fonts/') else 'OFL.txt'
            source_info = {**config['glyphs'], 'url': f"{config['glyphs']['baseUrl']}/{suffix}"}
        else:
            source_info = {'url': 'repo:mobile/scripts/build-map-assets.py', 'version': digest(Path(__file__)),
                           'license': ('Generated empty MapLibre style; no third-party content'
                                       if name == 'initial-style.json'
                                       else 'Original procedural artwork; no third-party sprite assets')}
        files[name] = {'bytes': path.stat().st_size, 'sha256': digest(path),
                       'sourceUrl': source_info['url'], 'sourceVersion': source_info['version'],
                       'license': source_info['license']}
    manifest = {
        'schemaVersion': 1, 'generatedAt': config['generatedAt'],
        'generationDatePolicy': 'Pinned batch date; wall-clock rebuild time does not change output.',
        'sources': {k: config[k] for k in ('basemap', 'osm', 'glyphs', 'extractor')},
        'configSha256': digest(config_path), 'generatorSha256': digest(Path(__file__)),
        'uvLockSha256': digest(Path(__file__).with_name('uv.lock')),
        'tools': {'python': sys.version.split()[0], 'zlib': zlib.ZLIB_VERSION,
                  **{name: version(name) for name in ('pmtiles', 'osmium', 'shapely', 'protobuf', 'mapbox-vector-tile')},
                  'extractor': 'PMTiles CLI 1.31.2'},
        'layers': config['layers'], 'sizes': sizes, 'featureCountsIncludingTileDuplicates': counts,
        'trees': tree_stats, 'boundaryRelationVersion': relation_version, 'glyphCoverage': coverage,
        'files': files, 'totalFileBytes': sum(f['bytes'] for f in files.values()),
    }
    write_json(args.output / 'manifest.json', manifest)
    print(json.dumps({'totalFileBytes': manifest['totalFileBytes'], 'sizes': sizes}), flush=True)


if __name__ == '__main__':
    main()
