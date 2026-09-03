import { createHash } from 'node:crypto';

import { SG_BOUNDS } from '../src/lib/data-gov/shared/constants';
import type { GeoJSONFeatureCollection } from '../src/lib/data-gov/shared/types';

export interface GeoDataQualityPolicy {
  label: string;
  minimumFeatureCount: number;
  requiredProperties: readonly string[];
  uniqueProperty?: string;
}

/**
 * Conservative lower bounds that catch catastrophic truncation without
 * requiring an upstream dataset to keep an exact point count.
 */
export const GEO_DATA_POLICIES = {
  recyclingBins: {
    label: 'Recycling Bins',
    minimumFeatureCount: 10_000,
    requiredProperties: ['Description'],
  },
  ewaste: {
    label: 'E-Waste Recycling Points',
    minimumFeatureCount: 500,
    requiredProperties: ['OBJECTID', 'NAME', 'DESCRIPTION', 'ADDRESSPOSTALCODE'],
    uniqueProperty: 'OBJECTID',
  },
  textile: {
    label: 'Textile Bins',
    minimumFeatureCount: 300,
    requiredProperties: ['OBJECTID', 'NAME'],
    uniqueProperty: 'OBJECTID',
  },
  reuseChannels: {
    label: 'NEA Reuse Channels',
    minimumFeatureCount: 50,
    requiredProperties: ['NAME', 'FULLADDRESS', 'ACCEPTEDITEMS', 'REUSETYPE'],
  },
  returnPoints: {
    label: 'BCRS Return Points',
    minimumFeatureCount: 1_000,
    requiredProperties: ['OBJECTID', 'NAME', 'FULLADDRESS', 'ADDRESSPOSTALCODE'],
    uniqueProperty: 'OBJECTID',
  },
} as const satisfies Record<string, GeoDataQualityPolicy>;

function hasValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return value !== null && value !== undefined;
}

export function validateGeoData(
  geojson: GeoJSONFeatureCollection,
  policy: GeoDataQualityPolicy,
): void {
  if (geojson?.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error(`${policy.label}: expected a GeoJSON FeatureCollection`);
  }

  if (geojson.features.length < policy.minimumFeatureCount) {
    throw new Error(
      `${policy.label}: ${geojson.features.length} features is below the minimum `
      + `${policy.minimumFeatureCount}`,
    );
  }

  const seenUniqueValues = new Set<string>();

  geojson.features.forEach((feature, index) => {
    if (feature?.type !== 'Feature' || feature.geometry?.type !== 'Point') {
      throw new Error(`${policy.label}: feature ${index} is not a Point feature`);
    }

    const coordinates = feature.geometry.coordinates;
    const lng = coordinates?.[0];
    const lat = coordinates?.[1];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      throw new Error(`${policy.label}: feature ${index} has invalid coordinates`);
    }

    if (
      lat < SG_BOUNDS.LAT_MIN
      || lat > SG_BOUNDS.LAT_MAX
      || lng < SG_BOUNDS.LNG_MIN
      || lng > SG_BOUNDS.LNG_MAX
    ) {
      throw new Error(
        `${policy.label}: feature ${index} coordinates (${lat}, ${lng}) are outside Singapore`,
      );
    }

    if (!feature.properties || typeof feature.properties !== 'object') {
      throw new Error(`${policy.label}: feature ${index} has no properties object`);
    }

    for (const property of policy.requiredProperties) {
      if (!hasValue(feature.properties[property])) {
        throw new Error(
          `${policy.label}: feature ${index} is missing required property ${property}`,
        );
      }
    }

    if (policy.uniqueProperty) {
      const value = String(feature.properties[policy.uniqueProperty]);
      if (seenUniqueValues.has(value)) {
        throw new Error(
          `${policy.label}: duplicate ${policy.uniqueProperty} value ${value}`,
        );
      }
      seenUniqueValues.add(value);
    }
  });
}

export function assertSnapshotFresh(
  label: string,
  capturedAt: string,
  maximumAgeDays: number,
  now: Date = new Date(),
): void {
  const capturedTime = Date.parse(capturedAt);
  if (Number.isNaN(capturedTime)) {
    throw new Error(`${label}: snapshot capturedAt is not a valid timestamp`);
  }

  const ageMs = now.getTime() - capturedTime;
  if (ageMs < 0) {
    throw new Error(`${label}: snapshot capturedAt is in the future`);
  }

  const maximumAgeMs = maximumAgeDays * 24 * 60 * 60 * 1_000;
  if (ageMs > maximumAgeMs) {
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1_000));
    throw new Error(
      `${label}: snapshot is ${ageDays} days old; maximum is ${maximumAgeDays} days`,
    );
  }
}

export function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
