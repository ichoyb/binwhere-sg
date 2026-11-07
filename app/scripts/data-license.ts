import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SNAPSHOT = 'app/data/data-license/protomaps.json';
const PAGE_DATA = 'app/src/data/data-license.json';
const DOWNLOAD_ROOT = 'app/public/data-license/methods';

const MAP_FILES = [
  'mobile/scripts/map-assets-config.json',
  'mobile/scripts/build-map-assets.py',
  'mobile/scripts/pyproject.toml',
  'mobile/scripts/uv.lock',
  'mobile/scripts/.python-version',
  'mobile/assets/map-assets/manifest.json',
];

const ROUTING_FILES = [
  'ops/routing/pins.json',
  'ops/routing/foot.lua',
  'ops/routing/foot.diff',
  'ops/routing/build-release.py',
  'ops/routing/build-engine.sh',
  'ops/routing/x64-linux-release.cmake',
  'ops/routing/build-release.sh',
  'ops/routing/Dockerfile.build',
];

const SOURCES = [
  ...MAP_FILES,
  ...ROUTING_FILES,
  'mobile/assets/map-assets/basemap.pmtiles',
  'mobile/assets/map-assets/trees.pmtiles',
  'mobile/assets/map-assets/country-mask.geojson',
  SNAPSHOT,
];

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

function generate() {
  const sources = new Map(SOURCES.map((path) => [path, readFileSync(resolve(ROOT, path))]));
  const json = (path: string) => JSON.parse(sources.get(path)!.toString('utf8'));
  const config = json(MAP_FILES[0]);
  const manifest = json(MAP_FILES[5]);
  const pins = json(ROUTING_FILES[0]);
  const protomaps = json(SNAPSHOT);
  assert.equal(protomaps.sourceUrl, config.basemap.url, 'Refresh the Protomaps metadata for this basemap source');
  for (const [field, path] of [
    ['configSha256', MAP_FILES[0]],
    ['generatorSha256', MAP_FILES[1]],
    ['uvLockSha256', 'mobile/scripts/uv.lock'],
  ]) {
    assert.equal(manifest[field], sha256(sources.get(path)!), `Map manifest is out of sync: ${path}`);
  }
  for (const name of ['basemap', 'osm']) assert.deepEqual(manifest.sources[name], config[name]);
  for (const name of ['basemap.pmtiles', 'trees.pmtiles', 'country-mask.geojson']) {
    assert.equal(manifest.files[name].sha256, sha256(sources.get(`mobile/assets/map-assets/${name}`)!));
  }

  const downloads = [
    ...MAP_FILES.map((source) => ({ source, group: 'map-assets' })),
    ...ROUTING_FILES.map((source) => ({ source, group: 'routing' })),
  ].map(({ source, group }) => ({
    source,
    href: `/data-license/methods/${group}/${basename(source).replace(/^\./, '')}.txt`,
    sha256: sha256(sources.get(source)!),
    bytes: sources.get(source)!.length,
  }));
  const data = {
    map: {
      generatedAt: manifest.generatedAt,
      basemap: config.basemap,
      osm: config.osm,
      layers: config.layers,
      tools: manifest.tools,
      trees: manifest.trees,
      boundaryRelationVersion: manifest.boundaryRelationVersion,
      files: Object.fromEntries(['basemap.pmtiles', 'trees.pmtiles', 'country-mask.geojson']
        .map((name) => [name, manifest.files[name]])),
    },
    protomaps: {
      attribution: protomaps.metadata.attribution,
      description: protomaps.metadata.description,
    },
    routing: {
      pins,
      profileSha256: sha256(sources.get('ops/routing/foot.lua')!),
    },
    downloads,
  };
  return new Map([
    [PAGE_DATA, Buffer.from(JSON.stringify(data, null, 2) + '\n')],
    ...downloads.map(({ source, href }) => [`app/public${href}`, sources.get(source)!] as const),
  ]);
}

async function refreshProtomaps() {
  const config = JSON.parse(readFileSync(resolve(ROOT, MAP_FILES[0]), 'utf8'));
  const sourceUrl = config.basemap.url;
  async function range(start: number, end: number) {
    const response = await fetch(sourceUrl, { headers: { Range: `bytes=${start}-${end}` } });
    assert.equal(response.status, 206, 'Protomaps must honor the byte range request');
    return Buffer.from(await response.arrayBuffer());
  }
  const header = await range(0, 126);
  const offset = Number(header.readBigUInt64LE(24));
  const length = Number(header.readBigUInt64LE(32));
  const compressed = await range(offset, offset + length - 1);
  const metadataBytes = gunzipSync(compressed);
  const snapshot = {
    sourceUrl,
    headerSha256: sha256(header),
    metadataSha256: sha256(compressed),
    metadata: JSON.parse(metadataBytes.toString('utf8')),
  };
  mkdirSync(dirname(resolve(ROOT, SNAPSHOT)), { recursive: true });
  writeFileSync(resolve(ROOT, SNAPSHOT), JSON.stringify(snapshot, null, 2) + '\n');
}

async function main() {
  const mode = process.argv[2];
  assert.ok(['--update', '--check', '--refresh-protomaps'].includes(mode),
    'Use --update, --check, or --refresh-protomaps');
  if (mode === '--refresh-protomaps') await refreshProtomaps();
  const outputs = generate();
  if (mode === '--check') {
    for (const [path, bytes] of outputs) {
      assert.ok(readFileSync(resolve(ROOT, path)).equals(bytes),
        `Data license is out of sync: ${path}. Run npm run data-license:update in app and include the generated files.`);
    }
    const actual = readdirSync(resolve(ROOT, DOWNLOAD_ROOT), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => relative(ROOT, resolve(entry.parentPath, entry.name))).sort();
    assert.deepEqual(actual, [...outputs.keys()].filter((path) => path !== PAGE_DATA).sort());
    console.log(`[data-license] Page data and ${outputs.size - 1} plain-text downloads match their sources`);
  } else {
    rmSync(resolve(ROOT, DOWNLOAD_ROOT), { recursive: true, force: true });
    for (const [path, bytes] of outputs) {
      mkdirSync(dirname(resolve(ROOT, path)), { recursive: true });
      writeFileSync(resolve(ROOT, path), bytes);
    }
    console.log(`[data-license] Updated page data and ${outputs.size - 1} plain-text downloads`);
  }
}

void main();
