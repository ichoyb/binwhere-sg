import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

import { assertSnapshotFresh, GEO_DATA_POLICIES, sha256, validateGeoData } from './geo-data-quality';
import { TEXTILE_MAXIMUM_AGE_DAYS } from './convert-textile-data';
import { parseEwasteDescription } from '../src/lib/ewaste';

export const GEO_DATA_FILES = {
  recyclingBins: 'recycling-bins.json',
  ewaste: 'ewaste-recycling-points.json',
  textile: 'textile-bins.json',
  reuseChannels: 'reuse-channels.json',
  returnPoints: 'return-points.json',
} as const;

export interface GeoDataManifestEntry {
  outputFile: string;
  sourceUrl: string;
  sourceApiUrl?: string;
  coverageSourceUrl?: string;
  coverageSourceSha256?: string;
  publisher: string;
  sourceMode: 'build-fetch' | 'versioned-local-snapshot';
  retrievedAt: string | null;
  upstreamUpdatedAt: string | null;
  coverageStart?: string | null;
  snapshotCapturedAt?: string;
  maximumAgeDays?: number;
  featureCount: number;
  minimumFeatureCount: number;
  sourceRecordCount?: number;
  excludedCollectionDriveCount?: number;
  declaredFeatureCount?: number;
  excludedInventoryRecordCount?: number;
  invalidLocationRecordCount?: number;
  queryCount?: number;
  queryRadiusMeters?: number;
  gridSpacingMeters?: number;
  observationCount?: number;
  duplicateObservationCount?: number;
  machineStatusIncluded?: boolean;
  responseDate?: string | null;
  responseEtag?: string | null;
  sha256: string;
}

export interface GeoDataManifest {
  schemaVersion: 1;
  generatedAt: string;
  datasets: Record<keyof typeof GEO_DATA_FILES, GeoDataManifestEntry>;
}

export const GEO_SNAPSHOT_DIR = path.join(__dirname, '..', 'data', 'geo-snapshot');
export const GENERATED_GEO_DIR = path.join(__dirname, '..', 'src', 'data', 'generated');
const MANIFEST_FILE = 'data-manifest.json';

function readManifest(directory: string): { text: string; value: GeoDataManifest; version: string } {
  const text = fs.readFileSync(path.join(directory, MANIFEST_FILE), 'utf8');
  const value = JSON.parse(text) as GeoDataManifest;
  assert.equal(value.schemaVersion, 1, 'Unsupported geo snapshot schema');
  assert.ok(Number.isFinite(Date.parse(value.generatedAt)), 'Invalid data generation timestamp');
  assert.deepEqual(Object.keys(value.datasets).sort(), Object.keys(GEO_DATA_FILES).sort(), 'Snapshot must contain all five datasets');
  for (const key of Object.keys(GEO_DATA_FILES) as Array<keyof typeof GEO_DATA_FILES>) {
    const entry = value.datasets[key];
    assert.equal(entry.outputFile, GEO_DATA_FILES[key], `${key}: unexpected output file`);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/, `${key}: invalid SHA256`);
    assert.equal(entry.minimumFeatureCount, GEO_DATA_POLICIES[key].minimumFeatureCount, `${key}: quality threshold differs`);
    assert.ok(Number.isInteger(entry.featureCount), `${key}: invalid feature count`);
    assert.ok(entry.sourceUrl && entry.publisher, `${key}: missing provenance`);
  }
  const ewaste = value.datasets.ewaste;
  assert.ok(Number.isInteger(ewaste.sourceRecordCount) && ewaste.sourceRecordCount! >= 0, 'ewaste: invalid source record count');
  assert.ok(Number.isInteger(ewaste.excludedCollectionDriveCount) && ewaste.excludedCollectionDriveCount! >= 0, 'ewaste: invalid excluded collection drive count');
  assert.equal(ewaste.sourceRecordCount, ewaste.featureCount + ewaste.excludedCollectionDriveCount!, 'ewaste: source, excluded and feature counts differ');
  const textile = value.datasets.textile;
  assert.equal(textile.maximumAgeDays, TEXTILE_MAXIMUM_AGE_DAYS, 'Textile snapshot age policy differs');
  assert.ok(textile.snapshotCapturedAt, 'Textile capture date is required');
  assertSnapshotFresh('Textile bins', textile.snapshotCapturedAt, TEXTILE_MAXIMUM_AGE_DAYS);
  return { text, value, version: sha256(text) };
}

/** Validate the complete input before any prepared/published directory changes. */
function readVerifiedData(directory: string, compressed: boolean) {
  const manifest = readManifest(directory);
  const files = new Map<string, Buffer>();
  for (const key of Object.keys(GEO_DATA_FILES) as Array<keyof typeof GEO_DATA_FILES>) {
    const entry = manifest.value.datasets[key];
    const stored = fs.readFileSync(path.join(directory, entry.outputFile + (compressed ? '.gz' : '')));
    const bytes = compressed ? gunzipSync(stored) : stored;
    const text = bytes.toString('utf8');
    assert.equal(sha256(text), entry.sha256, `${key}: content SHA256 mismatch`);
    const data = JSON.parse(text);
    validateGeoData(data, GEO_DATA_POLICIES[key]);
    assert.equal(data.features.length, entry.featureCount, `${key}: manifest feature count mismatch`);
    if (key === 'ewaste') {
      for (const { properties } of data.features) {
        const collection = parseEwasteDescription(properties.DESCRIPTION, properties.OBJECTID);
        assert.notEqual(collection.service, 'collection_drive', `ewaste: collection drive OBJECTID ${properties.OBJECTID} is not allowed in the snapshot`);
      }
    }
    files.set(entry.outputFile, bytes);
  }
  return { manifest, files };
}

/** Explicit data update: publish only after all five fetched datasets validate. */
export function publishGeoSnapshot(sourceDirectory: string, snapshotDirectory = GEO_SNAPSHOT_DIR): string {
  const { manifest, files } = readVerifiedData(sourceDirectory, false);
  const staging = `${snapshotDirectory}.staging-${process.pid}`;
  fs.mkdirSync(staging, { recursive: true });
  try {
    for (const [name, bytes] of files) {
      fs.writeFileSync(path.join(staging, `${name}.gz`), gzipSync(bytes, { level: 9 }));
    }
    fs.writeFileSync(path.join(staging, MANIFEST_FILE), manifest.text);
    readVerifiedData(staging, true);
    fs.rmSync(snapshotDirectory, { recursive: true, force: true });
    fs.renameSync(staging, snapshotDirectory);
    return manifest.version;
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

/** Offline build input: a missing or invalid pinned snapshot is a build error. */
export function prepareGeoData(snapshotDirectory = GEO_SNAPSHOT_DIR, outputDirectory = GENERATED_GEO_DIR): string {
  const { manifest, files } = readVerifiedData(snapshotDirectory, true);
  const staging = `${outputDirectory}.staging-${process.pid}`;
  fs.mkdirSync(staging, { recursive: true });
  try {
    for (const [name, bytes] of files) fs.writeFileSync(path.join(staging, name), bytes);
    fs.writeFileSync(path.join(staging, MANIFEST_FILE), manifest.text);
    fs.rmSync(outputDirectory, { recursive: true, force: true });
    fs.renameSync(staging, outputDirectory);
    return manifest.version;
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

/** The sanitized release must contain exactly the data selected by this commit. */
export function verifyPackagedGeoData(snapshotDirectory: string, packagedDirectory: string): string {
  const expected = readManifest(snapshotDirectory);
  const actual = readVerifiedData(packagedDirectory, false);
  assert.equal(actual.manifest.version, expected.version, 'Packaged data differs from the pinned snapshot');
  return expected.version;
}

if (require.main === module) {
  const command = process.argv[2];
  if (command === 'prepare') {
    console.log(`[geo-snapshot] Prepared verified snapshot ${prepareGeoData()} (offline)`);
  } else if (command === 'verify-package') {
    const packaged = path.join(__dirname, '..', '.next', 'deploy', 'app', 'src', 'data', 'generated');
    console.log(`[geo-snapshot] Packaged snapshot ${verifyPackagedGeoData(GEO_SNAPSHOT_DIR, packaged)}`);
  } else {
    throw new Error('Expected geo-data-snapshot.ts prepare | verify-package');
  }
}
