/**
 * Fetch the BCRS public location feed and convert complete map locations to
 * GeoJSON. Machine status is deliberately excluded: the feed exposes no
 * per-record status timestamp, so a build artifact cannot claim it is live.
 *
 * Usage: npx tsx scripts/convert-rvm-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { GeoJSONFeature, GeoJSONFeatureCollection } from '../src/lib/data-gov/shared/types';
import { GEO_DATA_POLICIES, validateGeoData } from './geo-data-quality';

export const BCRS_LOCATIONS_API_URL = 'https://bts.bcrs.sg/api/v1/locations';

const DEFAULT_GENERATED_DIR = path.join(__dirname, '..', 'src', 'data', 'generated');
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_INVALID_LOCATION_RATIO = 0.01;

interface BcrsLocationsResponse {
  status?: unknown;
  data?: unknown;
}

export interface RvmConversionResult {
  geojson: GeoJSONFeatureCollection;
  sourceRecordCount: number;
  excludedInventoryRecordCount: number;
  invalidLocationRecordCount: number;
}

export interface RvmBuildResult extends Omit<RvmConversionResult, 'geojson'> {
  featureCount: number;
  outputPath: string;
  retrievedAt: string;
  responseDate: string | null;
  responseEtag: string | null;
}

function hasValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function textValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function coordinateValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function addressWithOnePostalCode(address: string, postalCode: string): string {
  const escapedPostalCode = postalCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const occurrences = address.match(new RegExp(escapedPostalCode, 'g'))?.length ?? 0;

  if (occurrences < 2) return address;

  return address
    .replace(new RegExp(`,?\\s*${escapedPostalCode}\\s*$`), '')
    .replace(/,\s*$/, '')
    .trim();
}

export function convertRvmPayload(payload: unknown): RvmConversionResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('BCRS API returned a non-object response');
  }

  const response = payload as BcrsLocationsResponse;
  if (response.status !== 'ok' || !Array.isArray(response.data)) {
    throw new Error('BCRS API response is missing status=ok or a data array');
  }

  const features: GeoJSONFeature[] = [];
  const invalidLocations: string[] = [];
  let excludedInventoryRecordCount = 0;

  response.data.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      invalidLocations.push(`record ${index}`);
      return;
    }

    const record = entry as Record<string, unknown>;
    const locationFields = [
      record.locationName,
      record.latitude,
      record.longitude,
      record.address,
      record.postalCode,
    ];

    // The endpoint also includes machines that have not been assigned a map
    // location. They are inventory records, not incomplete map features.
    if (!locationFields.some(hasValue)) {
      excludedInventoryRecordCount++;
      return;
    }

    const id = textValue(record.id);
    const name = textValue(record.locationName);
    const address = textValue(record.address);
    const postalCode = textValue(record.postalCode);
    const lat = coordinateValue(record.latitude);
    const lng = coordinateValue(record.longitude);

    if (!id || !name || !address || !postalCode || lat === null || lng === null) {
      invalidLocations.push(id ? `id ${id}` : `record ${index}`);
      return;
    }

    const openingHours = textValue(record.rvmOpeningHours);
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        OBJECTID: id,
        NAME: name,
        FULLADDRESS: addressWithOnePostalCode(address, postalCode),
        ADDRESSPOSTALCODE: postalCode,
        ...(openingHours ? { OPENING_HOURS: openingHours } : {}),
      },
    });
  });

  const locationRecordCount = features.length + invalidLocations.length;
  const invalidRatio = locationRecordCount === 0
    ? 1
    : invalidLocations.length / locationRecordCount;
  if (invalidRatio > MAX_INVALID_LOCATION_RATIO) {
    throw new Error(
      `BCRS API has ${invalidLocations.length}/${locationRecordCount} invalid map locations `
      + `(first: ${invalidLocations.slice(0, 5).join(', ') || 'none'})`,
    );
  }

  return {
    geojson: { type: 'FeatureCollection', features },
    sourceRecordCount: response.data.length,
    excludedInventoryRecordCount,
    invalidLocationRecordCount: invalidLocations.length,
  };
}

export async function fetchAndConvertRvmData(
  outputDirectory = DEFAULT_GENERATED_DIR,
): Promise<RvmBuildResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(BCRS_LOCATIONS_API_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BinWhere/1.0',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`BCRS API responded ${response.status}: ${response.statusText}`);
    }

    const converted = convertRvmPayload(await response.json());
    validateGeoData(converted.geojson, GEO_DATA_POLICIES.returnPoints);

    const outputPath = path.join(outputDirectory, 'return-points.json');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(converted.geojson));

    return {
      featureCount: converted.geojson.features.length,
      outputPath,
      sourceRecordCount: converted.sourceRecordCount,
      excludedInventoryRecordCount: converted.excludedInventoryRecordCount,
      invalidLocationRecordCount: converted.invalidLocationRecordCount,
      retrievedAt: new Date().toISOString(),
      responseDate: response.headers.get('date'),
      responseEtag: response.headers.get('etag'),
    };
  } finally {
    clearTimeout(timeout);
  }
}

if (require.main === module) {
  fetchAndConvertRvmData()
    .then(({ featureCount, outputPath, invalidLocationRecordCount }) => {
      const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(0);
      console.log(
        `[convert-rvm] ${featureCount} features, ${invalidLocationRecordCount} invalid locations `
        + `-> ${outputPath} (${fileSizeKB} KB)`,
      );
    })
    .catch((error) => {
      console.error('[convert-rvm] Failed:', error);
      process.exit(1);
    });
}
