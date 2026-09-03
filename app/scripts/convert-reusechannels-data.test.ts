import assert from 'node:assert/strict';

import { convertReusechannelsPayload } from './convert-reusechannels-data';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

function payload() {
  return {
    SrchResults: [
      {
        FeatCount: 1,
        Theme_Name: 'Channels for Donation, Resale and Repair',
        Owner: 'NATIONAL ENVIRONMENT AGENCY',
        DateTime: '2024-01-03T14:53:51+00:00',
        Published_Date: '2022-08-19T00:00:00+00:00',
      },
      {
        NAME: 'Donation Point',
        DESCRIPTION: 'Accepts reusable goods',
        ADDRESSBUILDINGNAME: 'Example Building',
        ADDRESSBLOCKHOUSENUMBER: '1',
        ADDRESSPOSTALCODE: '018989',
        ADDRESSSTREETNAME: 'Marina Boulevard',
        ACCEPTEDITEMS: 'Clothing',
        REUSETYPE: 'Donate',
        FULLADDRESS: '1 Marina Boulevard',
        LatLng: '1.2823,103.8585',
      },
    ],
  };
}

runTest('convertReusechannelsPayload preserves every declared point', () => {
  const result = convertReusechannelsPayload(payload());
  assert.equal(result.declaredFeatureCount, 1);
  assert.equal(result.geojson.features.length, 1);
  assert.deepEqual(result.geojson.features[0].geometry.coordinates, [103.8585, 1.2823]);
});

runTest('convertReusechannelsPayload accepts the API string wrapper', () => {
  const result = convertReusechannelsPayload(JSON.stringify(payload()));
  assert.equal(result.geojson.features.length, 1);
});

runTest('convertReusechannelsPayload rejects count mismatches', () => {
  const data = payload();
  data.SrchResults[0].FeatCount = 2;
  assert.throws(() => convertReusechannelsPayload(data), /declared 2 features but returned 1/);
});

runTest('convertReusechannelsPayload rejects malformed coordinates', () => {
  const data = payload();
  data.SrchResults[1].LatLng = 'not-a-coordinate';
  assert.throws(() => convertReusechannelsPayload(data), /invalid LatLng/);
});
