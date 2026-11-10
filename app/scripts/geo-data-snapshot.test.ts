import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

import { sha256 } from './geo-data-quality';
import {
  GENERATED_GEO_DIR, GEO_DATA_FILES, GEO_SNAPSHOT_DIR, prepareGeoData, publishGeoSnapshot,
  verifyPackagedGeoData, type GeoDataManifest,
} from './geo-data-snapshot';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'binwhere-geo-snapshot-'));
const prepared = path.join(root, 'prepared');
const version = sha256(fs.readFileSync(path.join(GEO_SNAPSHOT_DIR, 'data-manifest.json'), 'utf8'));

function test(name: string, run: () => void) {
  run();
  console.log(`PASS ${name}`);
}

function fixture(name: string): string {
  const directory = path.join(root, name);
  fs.cpSync(GEO_SNAPSHOT_DIR, directory, { recursive: true });
  return directory;
}

function editManifest(directory: string, edit: (manifest: GeoDataManifest) => void) {
  const file = path.join(directory, 'data-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as GeoDataManifest;
  edit(manifest);
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

function filesDigest(directory: string): string {
  return sha256(fs.readdirSync(directory).sort().map((name) => (
    `${name}:${fs.readFileSync(path.join(directory, name)).toString('base64')}`
  )).join('\n'));
}

try {
  test('clean build prepares the pinned data with network disabled and retains its original dates', () => {
    const fetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error('Application build must not access upstream data'); };
    try {
      assert.equal(prepareGeoData(GEO_SNAPSHOT_DIR, prepared), version);
    } finally { globalThis.fetch = fetch; }
    assert.deepEqual(fs.readdirSync(prepared).sort(), ['data-manifest.json', ...Object.values(GEO_DATA_FILES)].sort());
    assert.equal(fs.readFileSync(path.join(prepared, 'data-manifest.json'), 'utf8'), fs.readFileSync(path.join(GEO_SNAPSHOT_DIR, 'data-manifest.json'), 'utf8'));
    assert.equal(verifyPackagedGeoData(GEO_SNAPSHOT_DIR, prepared), version);
  });

  test('missing pinned file fails instead of accepting existing prepared data', () => {
    const broken = fixture('missing');
    fs.unlinkSync(path.join(broken, 'return-points.json.gz'));
    const before = filesDigest(prepared);
    assert.throws(() => prepareGeoData(broken, prepared), /ENOENT/);
    assert.equal(filesDigest(prepared), before);
  });

  test('changed data bytes fail the pinned SHA check', () => {
    const broken = fixture('hash');
    const file = path.join(broken, 'reuse-channels.json.gz');
    const text = gunzipSync(fs.readFileSync(file)).toString('utf8');
    fs.writeFileSync(file, gzipSync(`${text}\n`));
    assert.throws(() => prepareGeoData(broken, prepared), /SHA256 mismatch/);
  });

  test('internally consistent hashes do not bypass existing geo quality rules', () => {
    const broken = fixture('coordinates');
    const file = path.join(broken, 'return-points.json.gz');
    const data = JSON.parse(gunzipSync(fs.readFileSync(file)).toString('utf8'));
    data.features[0].geometry.coordinates = [0, 0];
    const text = JSON.stringify(data);
    fs.writeFileSync(file, gzipSync(text));
    editManifest(broken, (manifest) => { manifest.datasets.returnPoints.sha256 = sha256(text); });
    assert.throws(() => prepareGeoData(broken, prepared), /outside Singapore/);
  });

  test('manifest counts and quality thresholds must agree with the data and current policy', () => {
    const wrongCount = fixture('count');
    editManifest(wrongCount, (manifest) => { manifest.datasets.returnPoints.featureCount++; });
    assert.throws(() => prepareGeoData(wrongCount, prepared), /manifest feature count mismatch/);
    const weakerPolicy = fixture('threshold');
    editManifest(weakerPolicy, (manifest) => { manifest.datasets.returnPoints.minimumFeatureCount = 0; });
    assert.throws(() => prepareGeoData(weakerPolicy, prepared), /quality threshold differs/);
  });

  test('versioned inputs retain the existing textile age limit', () => {
    const expired = fixture('expired');
    editManifest(expired, (manifest) => { manifest.datasets.textile.snapshotCapturedAt = '2000-01-01T00:00:00Z'; });
    assert.throws(() => prepareGeoData(expired, prepared), /maximum is 366 days/);
  });

  test('e-waste source, excluded and feature counts must agree', () => {
    const broken = fixture('ewaste-counts');
    editManifest(broken, (manifest) => { manifest.datasets.ewaste.sourceRecordCount!++; });
    assert.throws(() => prepareGeoData(broken, prepared), /ewaste: source, excluded and feature counts differ/);
    editManifest(broken, (manifest) => { delete manifest.datasets.ewaste.excludedCollectionDriveCount; });
    assert.throws(() => prepareGeoData(broken, prepared), /ewaste: invalid excluded collection drive count/);
  });

  test('unknown e-waste descriptions and collection drives cannot enter a prepared snapshot', () => {
    for (const [name, description, error] of [
      ['unknown-description', 'Unknown collection', /OBJECTID 9876: unknown DESCRIPTION "Unknown collection"/],
      ['collection-drive', 'E-waste collection drive; E-waste accepted: All regulated consumer products under First Schedule at https://go.gov.sg/prod-def-sl',
        /ewaste: collection drive OBJECTID 9876 is not allowed in the snapshot/],
    ] as const) {
      const broken = fixture(name);
      const file = path.join(broken, 'ewaste-recycling-points.json.gz');
      const data = JSON.parse(gunzipSync(fs.readFileSync(file)).toString('utf8'));
      data.features[0].properties.DESCRIPTION = description;
      data.features[0].properties.OBJECTID = 9876;
      const text = JSON.stringify(data);
      fs.writeFileSync(file, gzipSync(text));
      editManifest(broken, (manifest) => { manifest.datasets.ewaste.sha256 = sha256(text); });
      const before = filesDigest(prepared);
      assert.throws(() => prepareGeoData(broken, prepared), error);
      assert.equal(filesDigest(prepared), before);
    }
  });

  test('failed data validation cannot replace the selected snapshot', () => {
    const selected = fixture('selected');
    const invalid = path.join(root, 'invalid-refresh');
    fs.cpSync(prepared, invalid, { recursive: true });
    fs.unlinkSync(path.join(invalid, 'return-points.json'));
    const before = filesDigest(selected);
    assert.throws(() => publishGeoSnapshot(invalid, selected), /ENOENT/);
    assert.equal(filesDigest(selected), before);
    assert.equal(publishGeoSnapshot(prepared, selected), version);
    assert.equal(prepareGeoData(selected, path.join(root, 'roundtrip')), version);
  });

  test('upstream failure makes the refresh command fail without changing the selected or prepared data', () => {
    const selectedBefore = filesDigest(GEO_SNAPSHOT_DIR);
    const preparedBefore = filesDigest(GENERATED_GEO_DIR);
    const result = spawnSync(process.execPath, ['--import', 'tsx', '-e',
      'globalThis.fetch = async () => new Response("forbidden", { status: 403 }); require("./scripts/build-geo-data.ts");',
    ], { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 20_000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /403/);
    assert.equal(filesDigest(GEO_SNAPSHOT_DIR), selectedBefore);
    assert.equal(filesDigest(GENERATED_GEO_DIR), preparedBefore);
  });

  test('release package must use the exact selected data version', () => {
    const packageData = path.join(root, 'package');
    fs.cpSync(prepared, packageData, { recursive: true });
    editManifest(packageData, (manifest) => { manifest.generatedAt = '2000-01-01T00:00:00Z'; });
    assert.throws(() => verifyPackagedGeoData(GEO_SNAPSHOT_DIR, packageData), /differs from the pinned snapshot/);
  });
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
