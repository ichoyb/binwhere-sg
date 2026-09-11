/**
 * Fetch the NEA reuse-channel feed and convert every declared map point to
 * GeoJSON. Invalid or missing records fail the build instead of disappearing.
 *
 * Usage: npx tsx scripts/convert-reusechannels-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { GeoJSONFeature, GeoJSONFeatureCollection } from '../src/lib/data-gov/shared/types';
import { GEO_DATA_POLICIES, validateGeoData } from './geo-data-quality';

export const NEA_REUSE_API_URL = 'https://www.nea.gov.sg/api/OneMap/GetMapData/reusechannels';

const DEFAULT_GENERATED_DIR = path.join(__dirname, '..', 'src', 'data', 'generated');
const REQUEST_TIMEOUT_MS = 60_000;

interface NEAReusechannelPoint {
  NAME?: unknown;
  DESCRIPTION?: unknown;
  ADDRESSBUILDINGNAME?: unknown;
  ADDRESSBLOCKHOUSENUMBER?: unknown;
  ADDRESSPOSTALCODE?: unknown;
  ADDRESSSTREETNAME?: unknown;
  ACCEPTEDITEMS?: unknown;
  REUSETYPE?: unknown;
  FULLADDRESS?: unknown;
  LatLng?: unknown;
}

interface NEAReuseMetadata {
  FeatCount?: unknown;
  Theme_Name?: unknown;
  Owner?: unknown;
  DateTime?: unknown;
  Published_Date?: unknown;
}

export interface ReuseConversionResult {
  geojson: GeoJSONFeatureCollection;
  declaredFeatureCount: number;
  sourceUpdatedAt: string;
  sourcePublishedAt: string | null;
  sourceOwner: string;
}

export interface ReuseBuildResult extends Omit<ReuseConversionResult, 'geojson'> {
  featureCount: number;
  outputPath: string;
  retrievedAt: string;
  responseDate: string | null;
  responseEtag: string | null;
}

function requiredText(value: unknown, field: string, index: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`NEA reuse point ${index} is missing ${field}`);
  }
  return value.trim();
}

function optionalText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function unwrapPayload(payload: unknown): unknown {
  if (typeof payload !== 'string') return payload;
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    throw new Error('NEA reuse API returned an invalid JSON string');
  }
}

export function convertReusechannelsPayload(payload: unknown): ReuseConversionResult {
  const unwrapped = unwrapPayload(payload);
  if (!unwrapped || typeof unwrapped !== 'object' || Array.isArray(unwrapped)) {
    throw new Error('NEA reuse API returned a non-object response');
  }

  const results = (unwrapped as { SrchResults?: unknown }).SrchResults;
  if (!Array.isArray(results) || results.length < 2) {
    throw new Error('NEA reuse API returned empty or invalid SrchResults');
  }

  const metadata = results[0] as NEAReuseMetadata;
  const declaredFeatureCount = Number(metadata?.FeatCount);
  const sourceUpdatedAt = optionalText(metadata?.DateTime);
  const sourcePublishedAt = optionalText(metadata?.Published_Date) || null;
  const sourceOwner = requiredText(metadata?.Owner, 'metadata Owner', 0);

  if (!Number.isInteger(declaredFeatureCount) || declaredFeatureCount < 0) {
    throw new Error('NEA reuse metadata has an invalid FeatCount');
  }
  if (!sourceUpdatedAt || Number.isNaN(Date.parse(sourceUpdatedAt))) {
    throw new Error('NEA reuse metadata has an invalid DateTime');
  }

  const points = results.slice(1) as NEAReusechannelPoint[];
  if (points.length !== declaredFeatureCount) {
    throw new Error(
      `NEA reuse API declared ${declaredFeatureCount} features but returned ${points.length}`,
    );
  }

  const features: GeoJSONFeature[] = points.map((point, index) => {
    if (!point || typeof point !== 'object' || Array.isArray(point)) {
      throw new Error(`NEA reuse point ${index} is not an object`);
    }

    const latLng = requiredText(point.LatLng, 'LatLng', index).split(',');
    if (latLng.length !== 2) {
      throw new Error(`NEA reuse point ${index} has invalid LatLng`);
    }

    const lat = Number(latLng[0]);
    const lng = Number(latLng[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`NEA reuse point ${index} has non-numeric LatLng`);
    }

    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        NAME: requiredText(point.NAME, 'NAME', index),
        DESCRIPTION: optionalText(point.DESCRIPTION),
        ADDRESSBUILDINGNAME: optionalText(point.ADDRESSBUILDINGNAME),
        ADDRESSBLOCKHOUSENUMBER: optionalText(point.ADDRESSBLOCKHOUSENUMBER),
        ADDRESSPOSTALCODE: optionalText(point.ADDRESSPOSTALCODE),
        ADDRESSSTREETNAME: optionalText(point.ADDRESSSTREETNAME),
        ACCEPTEDITEMS: requiredText(point.ACCEPTEDITEMS, 'ACCEPTEDITEMS', index),
        REUSETYPE: requiredText(point.REUSETYPE, 'REUSETYPE', index),
        FULLADDRESS: requiredText(point.FULLADDRESS, 'FULLADDRESS', index),
      },
    };
  });

  return {
    geojson: { type: 'FeatureCollection', features },
    declaredFeatureCount,
    sourceUpdatedAt,
    sourcePublishedAt,
    sourceOwner,
  };
}

export async function fetchAndConvertReusechannels(
  outputDirectory = DEFAULT_GENERATED_DIR,
): Promise<ReuseBuildResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(NEA_REUSE_API_URL, {
      headers: {
        Accept: 'application/json',
        Referer: 'https://www.nea.gov.sg/',
        'User-Agent': 'BinWhere/1.0',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`NEA API responded ${response.status}: ${response.statusText}`);
    }

    const converted = convertReusechannelsPayload(await response.json());
    validateGeoData(converted.geojson, GEO_DATA_POLICIES.reuseChannels);

    const outputPath = path.join(outputDirectory, 'reuse-channels.json');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(converted.geojson));

    return {
      featureCount: converted.geojson.features.length,
      outputPath,
      declaredFeatureCount: converted.declaredFeatureCount,
      sourceUpdatedAt: converted.sourceUpdatedAt,
      sourcePublishedAt: converted.sourcePublishedAt,
      sourceOwner: converted.sourceOwner,
      retrievedAt: new Date().toISOString(),
      responseDate: response.headers.get('date'),
      responseEtag: response.headers.get('etag'),
    };
  } finally {
    clearTimeout(timeout);
  }
}

if (require.main === module) {
  fetchAndConvertReusechannels()
    .then(({ featureCount, outputPath }) => {
      const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(0);
      console.log(`[reusechannels] ${featureCount} features -> ${outputPath} (${fileSizeKB} KB)`);
    })
    .catch((error) => {
      console.error('[reusechannels] Failed:', error);
      process.exit(1);
    });
}
