import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { PLANNING_AREAS } from '@binwhere/core';
import { GEO_DATA_FILES, GEO_SNAPSHOT_DIR } from './geo-data-snapshot';

const bins = JSON.parse(gunzipSync(readFileSync(join(
  GEO_SNAPSHOT_DIR, `${GEO_DATA_FILES.recyclingBins}.gz`,
))).toString('utf8')) as { features: { geometry: { coordinates: [number, number] } }[] };
for (const area of PLANNING_AREAS) {
  const radians = Math.PI / 180;
  const count = bins.features.filter(({ geometry: { coordinates: [lng, lat] } }) => {
    const a = Math.sin((lat - area.lat) * radians / 2) ** 2
      + Math.cos(area.lat * radians) * Math.cos(lat * radians)
      * Math.sin((lng - area.lng) * radians / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 2;
  }).length;
  assert.ok(count >= 3, `${area.names.en}: ${count} blue bins within 2 km`);
  console.log(`PASS ${area.names.en}: ${count} blue bins within 2 km`);
}
