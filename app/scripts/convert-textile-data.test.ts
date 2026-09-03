import assert from 'node:assert/strict';

import { convertTextilePayload } from './convert-textile-data';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

const validPoint = {
  id: 'point-1',
  place: 'Example Textile Bin',
  lat: 1.3,
  lng: 103.8,
  binType: 'Bin collection',
  remarks: 'Near the entrance',
};

runTest('convertTextilePayload converts a complete point', () => {
  const result = convertTextilePayload([validPoint]);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.NAME, 'Example Textile Bin');
});

runTest('convertTextilePayload rejects missing required fields', () => {
  assert.throws(
    () => convertTextilePayload([{ ...validPoint, place: '' }]),
    /missing place/,
  );
});

runTest('convertTextilePayload rejects invalid coordinates', () => {
  assert.throws(
    () => convertTextilePayload([{ ...validPoint, lat: '1.3' }]),
    /invalid coordinates/,
  );
});
