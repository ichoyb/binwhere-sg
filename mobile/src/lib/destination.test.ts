import assert from 'node:assert/strict';
import { CHANNEL_STATUS, type ChannelType, type ClassifyResult } from '@binwhere/core';
import { automaticDestination, destinationLayers, findDestination, optionalDestination } from './destination';

for (const channel of Object.keys(CHANNEL_STATUS) as ChannelType[]) {
  const result: ClassifyResult = { item: 'Sofa', status: CHANNEL_STATUS[channel], channel,
    confidence: 0.9, reason: 'Test' };
  const query = automaticDestination(result);
  if (['blue_bin', 'general_waste', 'hazardous'].includes(channel)) {
    assert.equal(query, null, channel);
  } else if (channel === 'bulky_waste' || channel === 'donation') {
    assert.deepEqual(query, { channel: 'donation', acceptedItem: 'Furniture' });
    assert.deepEqual(destinationLayers(query!), []);
  } else {
    assert.deepEqual(query, { channel });
    assert.deepEqual(destinationLayers(query!), ['ewaste', 'ewaste_battery', 'lighting'].includes(channel) ? [] : [channel]);
  }
  assert.deepEqual(optionalDestination(result), channel === 'blue_bin' ? { channel: 'blue_bin' } : null);
}
assert.equal(automaticDestination({ item: 'Unknown', status: 'not_sure', channel: null,
  confidence: 0.2, reason: 'Unknown' }), null);
assert.deepEqual(destinationLayers({ channel: 'blue_bin' }), ['blue_bin']);
assert.deepEqual(destinationLayers({ channel: 'donation' }), ['donation']);
assert.deepEqual(automaticDestination({ item: 'Unmapped object', status: 'consider_donating', channel: 'donation',
  confidence: 0.9, reason: 'Reuse' }), { channel: 'donation' });
console.log('PASS every channel has its own automatic/button destination and exact layer rule');

async function main() {
  const original = globalThis.fetch;
  const point = { name: 'Return point', address: 'AMK', postalCode: '', distanceKm: 0.4, lat: 1.369, lng: 103.845 };
  try {
    for (const [counts, expectedRadii] of [ [[1], [1]], [[0, 1], [1, 5]], [[0, 0], [1, 5]] ] as const) {
      const radii: number[] = [];
      globalThis.fetch = async (input) => {
        const url = new URL(String(input));
        radii.push(Number(url.searchParams.get('radius')));
        assert.equal(url.searchParams.get('channel'), 'donation');
        assert.equal(url.searchParams.get('acceptedItem'), 'Furniture');
        assert.equal(url.searchParams.get('limit'), '1');
        const count = counts[radii.length - 1];
        return new Response(JSON.stringify({ channel: 'donation', center: { lat: 1.3691, lng: 103.8454 },
          radiusKm: radii.at(-1), count, results: count ? [point] : [] }), { status: 200 });
      };
      const result = await findDestination({ channel: 'donation', acceptedItem: 'Furniture' }, { lat: 1.3691, lng: 103.8454 });
      assert.deepEqual(radii, expectedRadii);
      assert.deepEqual(result, counts.at(-1) ? point : null);
    }
    let requests = 0;
    globalThis.fetch = async () => { requests++; throw new Error('offline'); };
    await assert.rejects(findDestination({ channel: 'return_point' }, { lat: 1.3691, lng: 103.8454 }));
    assert.equal(requests, 1);
    console.log('PASS nearby uses 1 km then 5 km only if empty, returns no point or propagates failure');
  } finally {
    globalThis.fetch = original;
  }
}
void main();
