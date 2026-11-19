import assert from 'node:assert/strict';
import { getPlanningArea } from '@binwhere/core';
import { fetchRoute } from '../api/client';
import { findDestination } from './destination';
import { locationFailureNotice, parseStoredArea, resolveLocationResult, sameLocationSelection, type LocationSelection } from './location-source';

const area = getPlanningArea('AM')!;
const manual: LocationSelection = { locationSource: 'manual', area };
const device: LocationSelection = { locationSource: 'device' };
const singapore = { lat: 1.3691, lng: 103.8454 };
const outside = { lat: 37.3349, lng: -122.009 };
assert.deepEqual(parseStoredArea('{"code":"AM"}'), { kind: 'valid', area });
assert.deepEqual(parseStoredArea(null), { kind: 'absent' });
for (const raw of ['{', 'null', '[]', '{}', '{"code":7}', '{"code":"unknown"}']) {
  assert.deepEqual(parseStoredArea(raw), { kind: 'invalid' }, raw);
}
console.log('PASS stored area distinguishes valid, absent, invalid JSON, wrong shape and unknown code');

for (const permission of ['granted', 'denied', 'undetermined', null] as const) {
  for (const location of [singapore, outside, null]) {
    assert.deepEqual(resolveLocationResult(manual, permission, location), {
      kind: 'manual', area, location: { lat: 1.370364, lng: 103.847057 },
    });
  }
}
assert.deepEqual(resolveLocationResult(device, 'granted', singapore), { kind: 'device', location: singapore });
assert.deepEqual(resolveLocationResult(device, 'granted', outside), { kind: 'failed', reason: 'outside' });
assert.deepEqual(resolveLocationResult(device, 'granted', null), { kind: 'failed', reason: 'unavailable' });
for (const location of [singapore, null]) {
  assert.deepEqual(resolveLocationResult(device, 'denied', location), { kind: 'failed', reason: 'denied' });
}
assert.deepEqual(resolveLocationResult(device, 'undetermined', null), { kind: 'failed', reason: 'unavailable' });
assert.deepEqual(resolveLocationResult(device, null, null), { kind: 'failed', reason: 'unavailable' });
assert.deepEqual(locationFailureNotice('denied'), { message: 'map.locationDenied', actions: ['settings', 'area'] });
assert.deepEqual(locationFailureNotice('unavailable'), { message: 'map.locationUnavailable', actions: ['retry', 'area'] });
assert.deepEqual(locationFailureNotice('outside'), { message: 'map.locationOutsideSingapore', actions: ['area'] });
assert.equal(sameLocationSelection(manual, { locationSource: 'manual', area: getPlanningArea('BD')! }), false);
assert.equal(sameLocationSelection(manual, device), false);
assert.equal(sameLocationSelection(manual, { ...manual }), true);
assert.equal(sameLocationSelection(device, { ...device }), true);
console.log('PASS location sources, device permission/read results and failure actions');

async function main() {
  const originalFetch = globalThis.fetch;
  const resolved = resolveLocationResult(manual, 'denied', outside);
  assert.equal(resolved.kind, 'manual');
  if (resolved.kind !== 'manual') throw new Error('Expected manual location');
  const requests: string[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push(String(input));
    if (String(input).includes('/nearby')) {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('lat'), '1.370364');
      assert.equal(url.searchParams.get('lng'), '103.847057');
      return new Response(JSON.stringify({ channel: 'blue_bin', center: resolved.location,
        radiusKm: Number(url.searchParams.get('radius')), count: 0, results: [] }));
    }
    const body = JSON.parse(init!.body as string);
    assert.deepEqual(body.origin, { lat: 1.370364, lng: 103.847057 });
    return new Response(JSON.stringify({ geometry: { type: 'LineString', coordinates: [
      [103.847057, 1.370364], [103.8454, 1.3691],
    ] }, distanceM: 300, durationS: 200, snappedOrigin: { ...body.origin, offsetM: 0 },
    snappedDestination: { ...body.destination, offsetM: 0 }, roadNetworkVersion: 'a'.repeat(64),
    osmDataTimestamp: '2026-11-01T21:21:36Z' }));
  };
  try {
    await findDestination({ channel: 'blue_bin' }, resolved.location);
    assert.deepEqual(requests.map((url) => new URL(url).searchParams.get('radius')), ['1', '5']);
    await fetchRoute({ origin: resolved.location, destination: singapore });
    console.log('PASS manual area is the nearby centre at 1/5 km and the route origin');
  } finally { globalThis.fetch = originalFetch; }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
