/**
 * Convert the versioned recycle.gov.sg textile snapshot to GeoJSON.
 * The snapshot date and maximum age are explicit so an old local file cannot
 * remain in production indefinitely without a failing build.
 *
 * Usage: npx tsx scripts/convert-textile-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { GeoJSONFeature, GeoJSONFeatureCollection } from '../src/lib/data-gov/shared/types';
import {
  assertSnapshotFresh,
  GEO_DATA_POLICIES,
  validateGeoData,
} from './geo-data-quality';

export const TEXTILE_SOURCE_URL = 'https://www.recycle.gov.sg/';
export const TEXTILE_SNAPSHOT_CAPTURED_AT = '2026-03-01T18:04:55+08:00';
export const TEXTILE_MAXIMUM_AGE_DAYS = 366;

const RAW_PATH = path.join(__dirname, '..', 'src', 'data', 'textile-bins-raw.json');
const DEFAULT_GENERATED_DIR = path.join(__dirname, '..', 'src', 'data', 'generated');

interface RawTextileBin {
  id?: unknown;
  place?: unknown;
  lat?: unknown;
  lng?: unknown;
  binType?: unknown;
  remarks?: unknown;
}

export interface TextileBuildResult {
  featureCount: number;
  outputPath: string;
  snapshotCapturedAt: string;
  maximumAgeDays: number;
}

function requiredText(value: unknown, field: string, index: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Textile point ${index} is missing ${field}`);
  }
  return value.trim();
}

export function convertTextilePayload(payload: unknown): GeoJSONFeatureCollection {
  if (!Array.isArray(payload)) {
    throw new Error('Textile snapshot is not an array');
  }

  const features: GeoJSONFeature[] = payload.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Textile point ${index} is not an object`);
    }

    const point = entry as RawTextileBin;
    const lat = point.lat;
    const lng = point.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Textile point ${index} has invalid coordinates`);
    }

    requiredText(point.binType, 'binType', index);

    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng as number, lat as number] },
      properties: {
        OBJECTID: requiredText(point.id, 'id', index),
        NAME: requiredText(point.place, 'place', index),
        DESCRIPTION: typeof point.remarks === 'string' ? point.remarks.trim() : '',
        ADDRESSPOSTALCODE: '',
        ACCESSRESTRICTION: 'Public',
      },
    };
  });

  return { type: 'FeatureCollection', features };
}

export function convertTextileData(
  outputDirectory = DEFAULT_GENERATED_DIR,
): TextileBuildResult {
  assertSnapshotFresh(
    'Textile bins',
    TEXTILE_SNAPSHOT_CAPTURED_AT,
    TEXTILE_MAXIMUM_AGE_DAYS,
  );

  const payload = JSON.parse(fs.readFileSync(RAW_PATH, 'utf-8')) as unknown;
  const geojson = convertTextilePayload(payload);
  validateGeoData(geojson, GEO_DATA_POLICIES.textile);

  const outputPath = path.join(outputDirectory, 'textile-bins.json');
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(geojson));

  return {
    featureCount: geojson.features.length,
    outputPath,
    snapshotCapturedAt: TEXTILE_SNAPSHOT_CAPTURED_AT,
    maximumAgeDays: TEXTILE_MAXIMUM_AGE_DAYS,
  };
}

if (require.main === module) {
  const { featureCount, outputPath } = convertTextileData();
  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(0);
  console.log(`[convert-textile] ${featureCount} features -> ${outputPath} (${fileSizeKB} KB)`);
}
