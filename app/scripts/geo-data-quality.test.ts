import assert from 'node:assert/strict';

import type { GeoJSONFeatureCollection } from '../src/lib/data-gov/shared/types';
import {
  assertSnapshotFresh,
  sha256,
  validateGeoData,
} from './geo-data-quality';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

function collection(count = 2): GeoJSONFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: Array.from({ length: count }, (_, index) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [103.8 + index / 1_000, 1.3] },
      properties: { OBJECTID: index + 1, NAME: `Point ${index + 1}` },
    })),
  };
}

const policy = {
  label: 'Test points',
  minimumFeatureCount: 2,
  requiredProperties: ['OBJECTID', 'NAME'],
  uniqueProperty: 'OBJECTID',
};

runTest('validateGeoData accepts a complete collection', () => {
  assert.doesNotThrow(() => validateGeoData(collection(), policy));
});

runTest('validateGeoData rejects a truncated collection', () => {
  assert.throws(() => validateGeoData(collection(1), policy), /below the minimum 2/);
});

runTest('validateGeoData rejects coordinates outside Singapore', () => {
  const data = collection();
  data.features[0].geometry.coordinates = [0, 0];
  assert.throws(() => validateGeoData(data, policy), /outside Singapore/);
});

runTest('validateGeoData rejects missing required properties', () => {
  const data = collection();
  data.features[0].properties.NAME = '';
  assert.throws(() => validateGeoData(data, policy), /missing required property NAME/);
});

runTest('validateGeoData rejects duplicate source identifiers', () => {
  const data = collection();
  data.features[1].properties.OBJECTID = 1;
  assert.throws(() => validateGeoData(data, policy), /duplicate OBJECTID value 1/);
});

runTest('assertSnapshotFresh enforces the declared maximum age', () => {
  assert.doesNotThrow(() => assertSnapshotFresh(
    'snapshot',
    '2026-03-01T00:00:00Z',
    366,
    new Date('2027-03-01T00:00:00Z'),
  ));
  assert.throws(() => assertSnapshotFresh(
    'snapshot',
    '2026-03-01T00:00:00Z',
    366,
    new Date('2027-03-03T00:00:01Z'),
  ), /maximum is 366 days/);
});

runTest('sha256 is deterministic', () => {
  assert.equal(
    sha256('BinWhere'),
    '2ab7c8dff5530e5d54b0f5bd2b261d361b1554823fdf126dd31fae6275a1190f',
  );
});
