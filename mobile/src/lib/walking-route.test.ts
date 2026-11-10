import assert from 'node:assert/strict';
import { routeDestinationGap, routeFailure, routeMidpoint } from './walking-route';
import { routeMapData } from '../map/route-data';
import { t, type ApiV2ErrorCode, type RouteResponse } from '@binwhere/core';

for (const locale of ['en', 'zh', 'ms', 'ta'] as const) {
  const [before, after] = t(locale, 'route.destinationGap').split('{name}');
  for (const name of ['Point $&', 'Point $$', "Point $` $'"]) {
    assert.equal(routeDestinationGap(locale, name), before + name + after);
  }
}
console.log('PASS destination gap preserves literal dollar patterns and only replaces the name in all four locales');

for (const [code, message, retry, report] of [
  ['ROUTE_NOT_ON_NETWORK', 'route.notOnNetwork', false, false],
  ['ROUTE_NOT_FOUND', 'route.notFound', false, false],
  ['RATE_LIMITED', 'error.tooMany', true, false],
  ['NETWORK_ERROR', 'error.networkError', true, false],
  ['SERVER_BUSY', 'route.unavailable', true, false],
  ['ROUTING_UNAVAILABLE', 'route.unavailable', true, false],
  ['ROUTING_TIMEOUT', 'route.unavailable', true, false],
  ['INVALID_RESPONSE', 'route.unavailable', true, false],
  ['FORBIDDEN', 'route.unavailable', true, true],
  ['INVALID_INPUT', 'route.unavailable', true, true],
] as const) {
  assert.deepEqual(routeFailure(code satisfies ApiV2ErrorCode | 'NETWORK_ERROR'), { message, retry, report });
  console.log(`PASS route failure ${code}`);
}

const midpoint = routeMidpoint([[103.8, 1.3], [103.801, 1.3], [103.804, 1.3]]);
assert.ok(Math.abs(midpoint[0] - 103.802) < 1e-9);
assert.equal(midpoint[1], 1.3);
assert.deepEqual(routeMidpoint([[103.8, 1.3], [103.8, 1.3], [103.804, 1.3]]), midpoint);
assert.deepEqual(routeMidpoint([[103.8, 1.3], [103.8, 1.3]]), [103.8, 1.3]);
const turn = routeMidpoint([[103.8, 1.3], [103.801, 1.3], [103.801, 1.303]]);
assert.equal(turn[0], 103.801);
assert.ok(turn[1] > 1.3009 && turn[1] < 1.3011);
console.log('PASS route midpoint follows segment lengths, corners and repeated points');

const geometry: RouteResponse['geometry'] = { type: 'LineString', coordinates: [[103.8, 1.3], [103.801, 1.3], [103.804, 1.3]] };
const data = routeMapData({ geometry, distanceM: 339 } as RouteResponse);
assert.equal(data.route.features[0].geometry, geometry);
assert.deepEqual(data.distance.features[0].geometry.coordinates, midpoint);
assert.equal(data.distance.features[0].properties.label, '339m');
console.log('PASS route geometry is unchanged and the distance label uses server distance at its length midpoint');
