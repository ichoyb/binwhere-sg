/**
 * Convert local BCRS return-point raw JSON to GeoJSON FeatureCollection.
 * Called by build-geo-data.ts during prebuild.
 *
 * Usage: npx tsx scripts/convert-rvm-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface RawOpeningHoursDayTime {
  day?: number;
  time?: string;
}

interface RawOpeningHoursPeriod {
  open?: RawOpeningHoursDayTime;
  close?: RawOpeningHoursDayTime;
}

interface RawOpeningHours {
  alwaysOpen?: boolean;
  periods?: RawOpeningHoursPeriod[];
  weekdayText?: string[];
}

interface RawReturnPoint {
  id: string;
  place: string;
  lat: number;
  long: number;
  machineStatus?: string;
  openingHours?: RawOpeningHours | null;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, unknown>;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

const APP_ROOT = process.cwd();
const RAW_PATH = path.join(APP_ROOT, 'src', 'data', 'rvm-return-points-raw.json');
const GENERATED_DIR = path.join(APP_ROOT, 'src', 'data', 'generated');
const OUTPUT_PATH = path.join(GENERATED_DIR, 'return-points.json');

export function normalizeMachineStatus(status?: string): string {
  return status === 'PRE_LAUNCH' ? 'ONLINE' : (status ?? '');
}

export function convertRvmData(): { featureCount: number; outputPath: string } {
  const raw: RawReturnPoint[] = JSON.parse(fs.readFileSync(RAW_PATH, 'utf-8'));

  const geojson: GeoJSONFeatureCollection = {
    type: 'FeatureCollection',
    features: raw
      .filter((point) => typeof point.lat === 'number' && typeof point.long === 'number')
      .map((point) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.long, point.lat],
        },
        properties: {
          OBJECTID: point.id,
          NAME: point.place,
          OPENING_HOURS: point.openingHours ?? null,
          ALWAYS_OPEN: point.openingHours?.alwaysOpen === true,
          MACHINE_STATUS: normalizeMachineStatus(point.machineStatus),
        },
      })),
  };

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson));

  return { featureCount: geojson.features.length, outputPath: OUTPUT_PATH };
}

if (require.main === module) {
  const { featureCount, outputPath } = convertRvmData();
  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(0);
  console.log(`[convert-rvm] ${featureCount} features -> ${outputPath} (${fileSizeKB} KB)`);
}
