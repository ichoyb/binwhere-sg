import assert from 'node:assert/strict';

import { convertRvmPayload } from './convert-rvm-data';

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
    /missing status=ok or a data array/,
  );
});
