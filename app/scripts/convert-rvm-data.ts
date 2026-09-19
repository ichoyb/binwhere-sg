/**
 * Reconstruct the public BCRS return-point dataset from the Return Right map.
 *
 * The public map exposes only radius queries, not a full location export. This
 * build fetches the map's own Singapore coverage geometry, queries a complete
 * deterministic grid, verifies overlapping observations, and converts the
 * unique locations to the existing GeoJSON contract.
 *
 * Machine status is deliberately excluded: it changes independently of the
 * static build artifact and must never be presented as a live claim.
 *
 * Usage: npx tsx scripts/convert-rvm-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { GeoJSONFeature, GeoJSONFeatureCollection } from '../src/lib/data-gov/shared/types';
import { GEO_DATA_POLICIES, sha256, validateGeoData } from './geo-data-quality';

export const BCRS_LOCATOR_URL = 'https://returnright.sg/p/find-my-nearest-rvm';
export const BCRS_MAP_APP_URL = 'https://returnright.sg/px/';
export const BCRS_MAP_API_BASE_URL = 'https://returnright.sg/px-api';
export const BCRS_REGION_GEO_URL = 'https://returnright.sg/px/SGRegionGeo.json';

export const BCRS_QUERY_RADIUS_METERS = 2_000;
export const BCRS_GRID_SPACING_METERS = 2_500;

const DEFAULT_GENERATED_DIR = path.join(__dirname, '..', 'src', 'data', 'generated');
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_REQUEST_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
const QUERY_CONCURRENCY = 3;
const MAX_INVALID_LOCATION_RATIO = 0.01;
const ACCESS_TOKEN_REFRESH_WINDOW_MS = 30_000;
const METERS_PER_LATITUDE_DEGREE = 111_320;

const PUBLIC_MAP_HEADERS = {
  Accept: 'application/json',
  Referer: BCRS_MAP_APP_URL,
  'User-Agent': 'BinWhere/1.0',
  'x-bcrs-client': 'web',
} as const;

interface BcrsLocationsResponse {
  status?: unknown;
  data?: unknown;
}

interface FetchedJson {
  payload: unknown;
  responseDate: string | null;
  responseEtag: string | null;
  contentSha256: string;
}

export interface BcrsCoverageBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface BcrsGridPoint {
  lat: number;
  lng: number;
}

export interface RvmPayloadMergeResult {
  payload: BcrsLocationsResponse;
  observationCount: number;
  duplicateObservationCount: number;
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
  queryCount: number;
  queryRadiusMeters: number;
  gridSpacingMeters: number;
  observationCount: number;
  duplicateObservationCount: number;
  coverageSourceSha256: string;
}

class NonRetryableFetchError extends Error {}

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

function numericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(
  url: string,
  label: string,
  headers: Record<string, string> | (() => Promise<Record<string, string>>) = PUBLIC_MAP_HEADERS,
): Promise<FetchedJson> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt++) {
    // Resolve short-lived credentials again for every attempt, including retries.
    const requestHeaders = typeof headers === 'function' ? await headers() : headers;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: requestHeaders,
        cache: 'no-store',
        signal: controller.signal,
      });
      const body = await response.text();

      if (!response.ok) {
        const requestError = new Error(
          label + ' responded ' + response.status + ': ' + response.statusText,
        );
        const retryable = response.status === 408
          || response.status === 429
          || response.status >= 500;
        if (!retryable) throw new NonRetryableFetchError(requestError.message);
        throw requestError;
      }

      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (!contentType.includes('application/json')) {
        throw new NonRetryableFetchError(
          label + ' returned ' + (contentType || 'an unknown content type') + ' instead of JSON',
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(body);
      } catch {
        throw new NonRetryableFetchError(label + ' returned invalid JSON');
      }

      return {
        payload,
        responseDate: response.headers.get('date'),
        responseEtag: response.headers.get('etag'),
        contentSha256: sha256(body),
      };
    } catch (error) {
      if (error instanceof NonRetryableFetchError) throw error;
      lastError = error;
      if (attempt < MAX_REQUEST_ATTEMPTS) {
        await delay(RETRY_BASE_DELAY_MS * attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(
    label + ' failed after ' + MAX_REQUEST_ATTEMPTS + ' attempts: ' + errorMessage(lastError),
  );
}

function envelopeData(payload: unknown, label: string): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(label + ' returned a non-object response');
  }

  const response = payload as BcrsLocationsResponse;
  if (
    (response.status !== 'ok' && response.status !== 'success')
    || !Object.hasOwn(response, 'data')
  ) {
    throw new Error(label + ' response is missing a successful status or data');
  }

  return response.data;
}

function dataObject(payload: unknown, label: string): Record<string, unknown> {
  const data = envelopeData(payload, label);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(label + ' data is not an object');
  }
  return data as Record<string, unknown>;
}

function locationRecords(payload: unknown, label: string): unknown[] {
  const data = envelopeData(payload, label);
  if (!Array.isArray(data)) {
    throw new Error(label + ' data is not an array');
  }
  return data;
}

export function parseNearbyRadius(payload: unknown): number {
  const config = dataObject(payload, 'BCRS map config');
  const radius = numericValue(config.nearbyRadius);
  if (radius !== BCRS_QUERY_RADIUS_METERS) {
    throw new Error(
      'BCRS map config nearbyRadius changed from ' + BCRS_QUERY_RADIUS_METERS + ' to '
      + (radius ?? 'an invalid value'),
    );
  }
  return radius;
}

function collectCoordinatePairs(node: unknown, output: Array<[number, number]>): void {
  if (!Array.isArray(node)) return;

  if (
    node.length >= 2
    && typeof node[0] === 'number'
    && Number.isFinite(node[0])
    && typeof node[1] === 'number'
    && Number.isFinite(node[1])
  ) {
    output.push([node[0], node[1]]);
    return;
  }

  for (const child of node) collectCoordinatePairs(child, output);
}

export function deriveCoverageBounds(payload: unknown): BcrsCoverageBounds {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('BCRS coverage source returned a non-object response');
  }

  const searchResults = (payload as Record<string, unknown>).SearchResults;
  if (!Array.isArray(searchResults) || searchResults.length === 0) {
    throw new Error('BCRS coverage source has no SearchResults');
  }

  const coordinates: Array<[number, number]> = [];
  for (const result of searchResults) {
    if (!result || typeof result !== 'object' || Array.isArray(result)) continue;
    const geojson = (result as Record<string, unknown>).geojson;
    if (!geojson || typeof geojson !== 'object' || Array.isArray(geojson)) continue;
    collectCoordinatePairs((geojson as Record<string, unknown>).coordinates, coordinates);
  }

  if (coordinates.length === 0) {
    throw new Error('BCRS coverage source contains no coordinates');
  }

  const bounds = coordinates.reduce<BcrsCoverageBounds>(
    (current, [lng, lat]) => ({
      minLat: Math.min(current.minLat, lat),
      maxLat: Math.max(current.maxLat, lat),
      minLng: Math.min(current.minLng, lng),
      maxLng: Math.max(current.maxLng, lng),
    }),
    {
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
    },
  );

  if (
    bounds.minLat < 1
    || bounds.maxLat > 2
    || bounds.minLng < 103
    || bounds.maxLng > 105
  ) {
    throw new Error('BCRS coverage source is outside the expected Singapore region');
  }

  return bounds;
}

function axisValues(min: number, max: number, maximumStep: number): number[] {
  const segmentCount = Math.max(1, Math.ceil((max - min) / maximumStep));
  return Array.from(
    { length: segmentCount + 1 },
    (_, index) => min + ((max - min) * index) / segmentCount,
  );
}

export function createCoverageGrid(
  bounds: BcrsCoverageBounds,
  spacingMeters = BCRS_GRID_SPACING_METERS,
): BcrsGridPoint[] {
  if (!Number.isFinite(spacingMeters) || spacingMeters <= 0) {
    throw new Error('BCRS grid spacing must be a positive finite number');
  }

  const maximumDistanceToGridPoint = spacingMeters / Math.SQRT2;
  if (maximumDistanceToGridPoint >= BCRS_QUERY_RADIUS_METERS) {
    throw new Error(
      'BCRS grid spacing ' + spacingMeters + 'm leaves gaps inside the '
      + BCRS_QUERY_RADIUS_METERS + 'm query radius',
    );
  }

  const latitudeStep = spacingMeters / METERS_PER_LATITUDE_DEGREE;
  const longitudeStep = spacingMeters
    / (METERS_PER_LATITUDE_DEGREE * Math.cos(bounds.minLat * Math.PI / 180));
  const latitudes = axisValues(bounds.minLat, bounds.maxLat, latitudeStep);
  const longitudes = axisValues(bounds.minLng, bounds.maxLng, longitudeStep);

  return latitudes.flatMap((lat) => longitudes.map((lng) => ({ lat, lng })));
}

function staticLocationSignature(record: Record<string, unknown>): string {
  return JSON.stringify({
    name: textValue(record.locationName),
    address: textValue(record.address),
    postalCode: textValue(record.postalCode) ?? textValue(record.zipcode),
    latitude: coordinateValue(record.latitude),
    longitude: coordinateValue(record.longitude),
    openingHours: textValue(record.rvmOpeningHours),
  });
}

function compareLocationIds(left: Record<string, unknown>, right: Record<string, unknown>): number {
  const leftId = textValue(left.id) ?? '';
  const rightId = textValue(right.id) ?? '';
  const leftNumber = Number(leftId);
  const rightNumber = Number(rightId);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return leftId.localeCompare(rightId);
}

export function mergeRvmPayloads(payloads: readonly unknown[]): RvmPayloadMergeResult {
  const recordsById = new Map<string, Record<string, unknown>>();
  const recordsWithoutIds: unknown[] = [];
  let observationCount = 0;

  payloads.forEach((payload, payloadIndex) => {
    const records = locationRecords(payload, 'BCRS nearby query ' + (payloadIndex + 1));
    observationCount += records.length;

    records.forEach((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        recordsWithoutIds.push(entry);
        return;
      }

      const record = entry as Record<string, unknown>;
      const id = textValue(record.id);
      if (!id) {
        recordsWithoutIds.push(record);
        return;
      }

      const existing = recordsById.get(id);
      if (existing && staticLocationSignature(existing) !== staticLocationSignature(record)) {
        throw new Error('BCRS location id ' + id + ' has conflicting static fields across queries');
      }
      if (!existing) recordsById.set(id, record);
    });
  });

  const uniqueRecords: unknown[] = [...recordsById.values()].sort(compareLocationIds);
  uniqueRecords.push(...recordsWithoutIds);

  return {
    payload: { status: 'ok', data: uniqueRecords },
    observationCount,
    duplicateObservationCount: observationCount - uniqueRecords.length,
  };
}

function addressWithOnePostalCode(address: string, postalCode: string): string {
  const escapedPostalCode = postalCode.replace(/[.*+?^{}()|[\]\\$]/g, '\\$&');
  const occurrences = address.match(new RegExp(escapedPostalCode, 'g'))?.length ?? 0;

  if (occurrences < 2) return address;

  return address
    .replace(new RegExp(',?\\s*' + escapedPostalCode + '\\s*$'), '')
    .replace(/,\s*$/, '')
    .trim();
}

export function convertRvmPayload(payload: unknown): RvmConversionResult {
  const records = locationRecords(payload, 'BCRS API');
  const features: GeoJSONFeature[] = [];
  const invalidLocations: string[] = [];
  let excludedInventoryRecordCount = 0;

  records.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      invalidLocations.push('record ' + index);
      return;
    }

    const record = entry as Record<string, unknown>;
    const locationFields = [
      record.locationName,
      record.latitude,
      record.longitude,
      record.address,
      record.postalCode,
      record.zipcode,
    ];

    if (!locationFields.some(hasValue)) {
      excludedInventoryRecordCount++;
      return;
    }

    const id = textValue(record.id);
    const name = textValue(record.locationName);
    const address = textValue(record.address);
    const postalCode = textValue(record.postalCode) ?? textValue(record.zipcode);
    const lat = coordinateValue(record.latitude);
    const lng = coordinateValue(record.longitude);

    if (!id || !name || !address || !postalCode || lat === null || lng === null) {
      invalidLocations.push(id ? 'id ' + id : 'record ' + index);
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
      'BCRS API has ' + invalidLocations.length + '/' + locationRecordCount
      + ' invalid map locations (first: '
      + (invalidLocations.slice(0, 5).join(', ') || 'none') + ')',
    );
  }

  return {
    geojson: { type: 'FeatureCollection', features },
    sourceRecordCount: records.length,
    excludedInventoryRecordCount,
    invalidLocationRecordCount: invalidLocations.length,
  };
}

async function fetchAccessToken(): Promise<{ token: string; expiresAt: number }> {
  const response = await fetchJson(
    BCRS_MAP_API_BASE_URL + '/locations/access-token',
    'BCRS map access token',
  );
  const data = dataObject(response.payload, 'BCRS map access token');
  const token = textValue(data.token);
  const expiresAt = numericValue(data.expiresAt);

  if (!token || expiresAt === null || expiresAt - Date.now() <= ACCESS_TOKEN_REFRESH_WINDOW_MS) {
    throw new Error('BCRS map access token is missing or expires too soon');
  }
  return { token, expiresAt };
}

async function fetchNearbyRadius(): Promise<number> {
  const response = await fetchJson(
    BCRS_MAP_API_BASE_URL + '/public/config/rvm_map_config',
    'BCRS map config',
  );
  return parseNearbyRadius(response.payload);
}

async function fetchCoverage(): Promise<{
  bounds: BcrsCoverageBounds;
  contentSha256: string;
}> {
  const response = await fetchJson(
    BCRS_REGION_GEO_URL,
    'BCRS Singapore coverage source',
    {
      Accept: 'application/json',
      Referer: BCRS_MAP_APP_URL,
      'User-Agent': 'BinWhere/1.0',
    },
  );
  return {
    bounds: deriveCoverageBounds(response.payload),
    contentSha256: response.contentSha256,
  };
}

async function fetchNearbyPayloads(
  grid: readonly BcrsGridPoint[],
): Promise<FetchedJson[]> {
  const results = new Array<FetchedJson>(grid.length);
  let nextIndex = 0;
  let cachedToken: Awaited<ReturnType<typeof fetchAccessToken>> | undefined;
  let pendingToken: ReturnType<typeof fetchAccessToken> | undefined;

  async function requestHeaders(): Promise<Record<string, string>> {
    if (!cachedToken || cachedToken.expiresAt - Date.now() <= ACCESS_TOKEN_REFRESH_WINDOW_MS) {
      // All workers share a single refresh; tokens never enter output or metadata.
      pendingToken ??= fetchAccessToken();
      try {
        cachedToken = await pendingToken;
      } finally {
        pendingToken = undefined;
      }
    }
    return { ...PUBLIC_MAP_HEADERS, 'x-bcrs-map-token': cachedToken.token };
  }

  async function worker(): Promise<void> {
    while (nextIndex < grid.length) {
      const index = nextIndex;
      nextIndex++;
      const point = grid[index];
      const url = new URL(
        BCRS_MAP_API_BASE_URL + '/locations/nearby',
      );
      url.searchParams.set('lat', point.lat.toFixed(9));
      url.searchParams.set('lng', point.lng.toFixed(9));
      url.searchParams.set('radius', String(BCRS_QUERY_RADIUS_METERS));

      results[index] = await fetchJson(
        url.toString(),
        'BCRS nearby query ' + (index + 1) + '/' + grid.length,
        requestHeaders,
      );
    }
  }

  await Promise.all(Array.from({ length: QUERY_CONCURRENCY }, () => worker()));
  return results;
}

export async function fetchAndConvertRvmData(
  outputDirectory = DEFAULT_GENERATED_DIR,
): Promise<RvmBuildResult> {
  const [queryRadiusMeters, coverage] = await Promise.all([
    fetchNearbyRadius(),
    fetchCoverage(),
  ]);
  const grid = createCoverageGrid(coverage.bounds);
  const nearbyResponses = await fetchNearbyPayloads(grid);
  const merged = mergeRvmPayloads(nearbyResponses.map(({ payload }) => payload));
  const converted = convertRvmPayload(merged.payload);
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
    responseDate: nearbyResponses.find(({ responseDate }) => responseDate)?.responseDate ?? null,
    responseEtag: nearbyResponses.find(({ responseEtag }) => responseEtag)?.responseEtag ?? null,
    queryCount: grid.length,
    queryRadiusMeters,
    gridSpacingMeters: BCRS_GRID_SPACING_METERS,
    observationCount: merged.observationCount,
    duplicateObservationCount: merged.duplicateObservationCount,
    coverageSourceSha256: coverage.contentSha256,
  };
}

if (require.main === module) {
  fetchAndConvertRvmData()
    .then(({
      featureCount,
      outputPath,
      invalidLocationRecordCount,
      queryCount,
      observationCount,
    }) => {
      const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(0);
      console.log(
        '[convert-rvm] ' + featureCount + ' features from ' + observationCount
        + ' observations across ' + queryCount + ' queries, '
        + invalidLocationRecordCount + ' invalid locations -> ' + outputPath
        + ' (' + fileSizeKB + ' KB)',
      );
    })
    .catch((error) => {
      console.error('[convert-rvm] Failed:', error);
      process.exit(1);
    });
}
