import assert from 'node:assert/strict';

import {
  BCRS_QUERY_RADIUS_METERS,
  convertRvmPayload,
  createCoverageGrid,
  deriveCoverageBounds,
  mergeRvmPayloads,
  parseNearbyRadius,
} from './convert-rvm-data';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

function location(overrides: Record<string, unknown> = {}) {
  return {
    id: 827,
    locationName: 'Blk 641, Pasir Ris Drive 1',
    latitude: '1.37646400',
    longitude: '103.93956100',
    address: 'Blk 641, Pasir Ris Drive 1, 510641',
    postalCode: '510641',
    status: 'PRE_LAUNCH',
    rvmOpeningHours: 'Mon - Sun: 24 Hrs',
    ...overrides,
  };
}

runTest('convertRvmPayload publishes complete locations without machine status', () => {
  const result = convertRvmPayload({ status: 'ok', data: [location()] });
  const feature = result.geojson.features[0];

  assert.deepEqual(feature.geometry.coordinates, [103.939561, 1.376464]);
  assert.equal(feature.properties.NAME, 'Blk 641, Pasir Ris Drive 1');
  assert.equal(feature.properties.FULLADDRESS, 'Blk 641, Pasir Ris Drive 1, 510641');
  assert.equal(feature.properties.OPENING_HOURS, 'Mon - Sun: 24 Hrs');
  assert.equal('MACHINE_STATUS' in feature.properties, false);
});

runTest('convertRvmPayload removes only a duplicated trailing postal code', () => {
  const result = convertRvmPayload({
    status: 'ok',
    data: [location({
      address: '10 Eunos Road 8, SingPost Centre #B1-101 to 107 (408600), 408600',
      postalCode: '408600',
    })],
  });

  assert.equal(
    result.geojson.features[0].properties.FULLADDRESS,
    '10 Eunos Road 8, SingPost Centre #B1-101 to 107 (408600)',
  );
});

runTest('convertRvmPayload accepts the current zipcode fallback', () => {
  const result = convertRvmPayload({
    status: 'ok',
    data: [location({ postalCode: null, zipcode: '510641' })],
  });

  assert.equal(result.geojson.features[0].properties.ADDRESSPOSTALCODE, '510641');
});

runTest('convertRvmPayload counts pure inventory records separately', () => {
  const result = convertRvmPayload({
    status: 'ok',
    data: [
      location(),
      location({
        id: 999,
        locationName: null,
        latitude: null,
        longitude: null,
        address: null,
        postalCode: null,
      }),
    ],
  });

  assert.equal(result.geojson.features.length, 1);
  assert.equal(result.excludedInventoryRecordCount, 1);
  assert.equal(result.invalidLocationRecordCount, 0);
});

runTest('convertRvmPayload rejects a materially incomplete location feed', () => {
  assert.throws(() => convertRvmPayload({
    status: 'ok',
    data: [location(), location({ id: 828, latitude: null, longitude: null })],
  }), /invalid map locations/);
});

runTest('convertRvmPayload rejects an invalid response envelope', () => {
  assert.throws(
    () => convertRvmPayload({ status: 'error', data: [] }),
    /missing a successful status or data/,
  );
});

runTest('deriveCoverageBounds reads every official planning-area geometry', () => {
  const bounds = deriveCoverageBounds({
    SearchResults: [
      {
        geojson: {
          type: 'Polygon',
          coordinates: [[
            [103.61, 1.16],
            [103.90, 1.16],
            [103.90, 1.40],
            [103.61, 1.16],
          ]],
        },
      },
      {
        geojson: {
          type: 'MultiPolygon',
          coordinates: [[[[104.08, 1.47], [104.00, 1.45], [104.08, 1.47]]]],
        },
      },
    ],
  });

  assert.deepEqual(bounds, {
    minLat: 1.16,
    maxLat: 1.47,
    minLng: 103.61,
    maxLng: 104.08,
  });
});

runTest('createCoverageGrid includes all bounds without radius gaps', () => {
  const grid = createCoverageGrid({
    minLat: 1.20,
    maxLat: 1.22,
    minLng: 103.80,
    maxLng: 103.82,
  });

  assert.equal(grid.length, 4);
  assert.deepEqual(grid[0], { lat: 1.20, lng: 103.80 });
  assert.deepEqual(grid[3], { lat: 1.22, lng: 103.82 });
  assert.throws(
    () => createCoverageGrid({
      minLat: 1.20,
      maxLat: 1.22,
      minLng: 103.80,
      maxLng: 103.82,
    }, BCRS_QUERY_RADIUS_METERS * Math.SQRT2),
    /leaves gaps/,
  );
});

runTest('mergeRvmPayloads deduplicates live observations and sorts stable IDs', () => {
  const merged = mergeRvmPayloads([
    {
      status: 'ok',
      data: [location({ id: 10, status: 'RUNNING', distance: 200 })],
    },
    {
      status: 'ok',
      data: [
        location({ id: 10, status: 'FULL', distance: 900, updatedAt: 'later' }),
        location({ id: 2, locationName: 'Second point' }),
      ],
    },
  ]);
  const records = merged.payload.data as Array<Record<string, unknown>>;

  assert.equal(merged.observationCount, 3);
  assert.equal(merged.duplicateObservationCount, 1);
  assert.deepEqual(records.map(({ id }) => id), [2, 10]);
});

runTest('mergeRvmPayloads rejects inconsistent static fields for one ID', () => {
  assert.throws(
    () => mergeRvmPayloads([
      { status: 'ok', data: [location({ id: 10 })] },
      { status: 'ok', data: [location({ id: 10, address: 'Different address' })] },
    ]),
    /conflicting static fields/,
  );
});

runTest('parseNearbyRadius fails closed when the map contract changes', () => {
  assert.equal(
    parseNearbyRadius({ status: 'success', data: { nearbyRadius: BCRS_QUERY_RADIUS_METERS } }),
    BCRS_QUERY_RADIUS_METERS,
  );
  assert.throws(
    () => parseNearbyRadius({ status: 'ok', data: { nearbyRadius: 1_000 } }),
    /nearbyRadius changed/,
  );
});
