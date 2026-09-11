/**
 * Build all production GeoJSON from declared sources.
 *
 * The generated directory is replaced only after every source, quality gate,
 * and manifest entry succeeds. Any failure leaves no generated data behind,
 * so a stale or partial dataset cannot be packaged accidentally.
 *
 * Usage: npx tsx scripts/build-geo-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { DatasetClient } from '../src/lib/data-gov/api/dataset-client';
import { HttpClient } from '../src/lib/data-gov/api/http-client';
import { API_URLS, DATASET_IDS } from '../src/lib/data-gov/shared/constants';
import type { DatasetMetadata, GeoJSONFeatureCollection } from '../src/lib/data-gov/shared/types';
import {
  fetchAndConvertReusechannels,
  NEA_REUSE_API_URL,
} from './convert-reusechannels-data';
import {
  BCRS_LOCATOR_URL,
  BCRS_MAP_API_BASE_URL,
  BCRS_REGION_GEO_URL,
  fetchAndConvertRvmData,
} from './convert-rvm-data';
import {
  convertTextileData,
  TEXTILE_SOURCE_URL,
} from './convert-textile-data';
import {
  GEO_DATA_POLICIES,
  type GeoDataQualityPolicy,
  sha256,
  validateGeoData,
} from './geo-data-quality';

const GENERATED_DIR = path.join(__dirname, '..', 'src', 'data', 'generated');
const STAGING_DIR = path.join(
  __dirname,
  '..',
  'src',
  'data',
  `.generated-staging-${process.pid}`,
);

interface DatasetConfig {
  id: string;
  outputFile: string;
  label: string;
  manifestKey: 'recyclingBins' | 'ewaste';
  policy: GeoDataQualityPolicy;
}

interface GeoDataManifestEntry {
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

interface GeoDataManifest {
  schemaVersion: 1;
  generatedAt: string;
  datasets: {
    recyclingBins: GeoDataManifestEntry;
    ewaste: GeoDataManifestEntry;
    textile: GeoDataManifestEntry;
    reuseChannels: GeoDataManifestEntry;
    returnPoints: GeoDataManifestEntry;
  };
}

const DATASETS: DatasetConfig[] = [
  {
    id: DATASET_IDS.RECYCLING_BINS,
    outputFile: 'recycling-bins.json',
    label: 'Recycling Bins (Blue Bins)',
    manifestKey: 'recyclingBins',
    policy: GEO_DATA_POLICIES.recyclingBins,
  },
  {
    id: DATASET_IDS.EWASTE_RECYCLING_POINTS,
    outputFile: 'ewaste-recycling-points.json',
    label: 'E-Waste Recycling Points',
    manifestKey: 'ewaste',
    policy: GEO_DATA_POLICIES.ewaste,
  },
];

function writeGeoJson(outputFile: string, geojson: GeoJSONFeatureCollection): string {
  const content = JSON.stringify(geojson);
  fs.writeFileSync(path.join(STAGING_DIR, outputFile), content);
  return sha256(content);
}

function fileSha256(outputPath: string): string {
  return sha256(fs.readFileSync(outputPath, 'utf-8'));
}

function logOutput(featureCount: number, outputPath: string, startedAt: number): void {
  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(0);
  const elapsed = ((Date.now() - startedAt) / 1_000).toFixed(1);
  console.log(`  -> ${featureCount} features, ${fileSizeKB} KB, ${elapsed}s\n`);
}

function dataGovManifestEntry(
  dataset: DatasetConfig,
  metadata: DatasetMetadata,
  featureCount: number,
  retrievedAt: string,
  contentSha256: string,
): GeoDataManifestEntry {
  return {
    outputFile: dataset.outputFile,
    sourceUrl: `${API_URLS.DATASET_METADATA}/datasets/${dataset.id}/metadata`,
    publisher: metadata.managedBy,
    sourceMode: 'build-fetch',
    retrievedAt,
    upstreamUpdatedAt: metadata.lastUpdatedAt,
    coverageStart: metadata.coverageStart ?? null,
    featureCount,
    minimumFeatureCount: dataset.policy.minimumFeatureCount,
    sha256: contentSha256,
  };
}

async function buildAllData(): Promise<GeoDataManifest> {
  const http = new HttpClient({ timeoutMs: 60_000, maxRetries: 3 });
  const client = new DatasetClient(http);
  const dataGovEntries = {} as Pick<GeoDataManifest['datasets'], 'recyclingBins' | 'ewaste'>;

  for (const dataset of DATASETS) {
    console.log(`[build-geo-data] Downloading: ${dataset.label} (${dataset.id})`);
    const startedAt = Date.now();
    const metadata = await client.getMetadata(dataset.id);
    const geojson = await client.getGeoJSON(dataset.id);
    validateGeoData(geojson, dataset.policy);

    const contentSha256 = writeGeoJson(dataset.outputFile, geojson);
    const outputPath = path.join(STAGING_DIR, dataset.outputFile);
    const retrievedAt = new Date().toISOString();
    dataGovEntries[dataset.manifestKey] = dataGovManifestEntry(
      dataset,
      metadata,
      geojson.features.length,
      retrievedAt,
      contentSha256,
    );
    logOutput(geojson.features.length, outputPath, startedAt);
  }

  console.log('[build-geo-data] Converting textile bins...');
  const textileStartedAt = Date.now();
  const textile = convertTextileData(STAGING_DIR);
  logOutput(textile.featureCount, textile.outputPath, textileStartedAt);

  console.log('[build-geo-data] Fetching NEA Reuse Channels...');
  const reuseStartedAt = Date.now();
  const reuse = await fetchAndConvertReusechannels(STAGING_DIR);
  logOutput(reuse.featureCount, reuse.outputPath, reuseStartedAt);

  console.log('[build-geo-data] Fetching BCRS Return Points...');
  const returnPointsStartedAt = Date.now();
  const returnPoints = await fetchAndConvertRvmData(STAGING_DIR);
  logOutput(returnPoints.featureCount, returnPoints.outputPath, returnPointsStartedAt);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    datasets: {
      ...dataGovEntries,
      textile: {
        outputFile: path.basename(textile.outputPath),
        sourceUrl: TEXTILE_SOURCE_URL,
        publisher: 'Cloop / recycle.gov.sg',
        sourceMode: 'versioned-local-snapshot',
        retrievedAt: null,
        upstreamUpdatedAt: null,
        snapshotCapturedAt: textile.snapshotCapturedAt,
        maximumAgeDays: textile.maximumAgeDays,
        featureCount: textile.featureCount,
        minimumFeatureCount: GEO_DATA_POLICIES.textile.minimumFeatureCount,
        sha256: fileSha256(textile.outputPath),
      },
      reuseChannels: {
        outputFile: path.basename(reuse.outputPath),
        sourceUrl: NEA_REUSE_API_URL,
        publisher: reuse.sourceOwner,
        sourceMode: 'build-fetch',
        retrievedAt: reuse.retrievedAt,
        upstreamUpdatedAt: reuse.sourceUpdatedAt,
        coverageStart: reuse.sourcePublishedAt,
        declaredFeatureCount: reuse.declaredFeatureCount,
        featureCount: reuse.featureCount,
        minimumFeatureCount: GEO_DATA_POLICIES.reuseChannels.minimumFeatureCount,
        responseDate: reuse.responseDate,
        responseEtag: reuse.responseEtag,
        sha256: fileSha256(reuse.outputPath),
      },
      returnPoints: {
        outputFile: path.basename(returnPoints.outputPath),
        sourceUrl: BCRS_LOCATOR_URL,
        sourceApiUrl: BCRS_MAP_API_BASE_URL,
        coverageSourceUrl: BCRS_REGION_GEO_URL,
        coverageSourceSha256: returnPoints.coverageSourceSha256,
        publisher: 'Beverage Container Return Scheme operator',
        sourceMode: 'build-fetch',
        retrievedAt: returnPoints.retrievedAt,
        upstreamUpdatedAt: null,
        featureCount: returnPoints.featureCount,
        minimumFeatureCount: GEO_DATA_POLICIES.returnPoints.minimumFeatureCount,
        sourceRecordCount: returnPoints.sourceRecordCount,
        excludedInventoryRecordCount: returnPoints.excludedInventoryRecordCount,
        invalidLocationRecordCount: returnPoints.invalidLocationRecordCount,
        queryCount: returnPoints.queryCount,
        queryRadiusMeters: returnPoints.queryRadiusMeters,
        gridSpacingMeters: returnPoints.gridSpacingMeters,
        observationCount: returnPoints.observationCount,
        duplicateObservationCount: returnPoints.duplicateObservationCount,
        machineStatusIncluded: false,
        responseDate: returnPoints.responseDate,
        responseEtag: returnPoints.responseEtag,
        sha256: fileSha256(returnPoints.outputPath),
      },
    },
  };
}

async function main(): Promise<void> {
  console.log('[build-geo-data] Starting verified data build...\n');

  fs.rmSync(GENERATED_DIR, { recursive: true, force: true });
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
  fs.mkdirSync(STAGING_DIR, { recursive: true });

  try {
    const manifest = await buildAllData();
    fs.writeFileSync(
      path.join(STAGING_DIR, 'data-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    fs.renameSync(STAGING_DIR, GENERATED_DIR);

    console.log('[build-geo-data] Verified files:');
    const files = fs.readdirSync(GENERATED_DIR).filter((file) => file.endsWith('.json'));
    for (const file of files) {
      const size = (fs.statSync(path.join(GENERATED_DIR, file)).size / 1024).toFixed(0);
      console.log(`  ${file} (${size} KB)`);
    }
  } catch (error) {
    fs.rmSync(STAGING_DIR, { recursive: true, force: true });
    fs.rmSync(GENERATED_DIR, { recursive: true, force: true });
    throw error;
  }
}

main().catch((error) => {
  console.error('[build-geo-data] Fatal error:', error);
  process.exit(1);
});
