import assert from 'node:assert/strict';

import { NextRequest } from 'next/server';
import {
  ApiErrorResponseSchema,
  NearbyChannelSchema,
  NearbyResponseSchema,
} from '@binwhere/core';

import { GET } from './route';

/**
 * Route-level freeze of the v1 nearby contract, run against the real
 * generated datasets. The client-side snapshot in packages/core/contracts
 * pins the schema; this pins what the handler actually emits, which is what
 * an installed app version will parse for as long as it stays installed.
 */

function runTest(name: string, fn: () => Promise<void>) {
  return fn().then(() => console.log(`PASS ${name}`));
}

let clientCounter = 0;

/** Each request comes from a fresh client, so per-IP limits never interfere. */
function request(query: Record<string, string>): NextRequest {
  clientCounter += 1;
  const ip = `203.0.113.${clientCounter}`;
  const url = new URL('https://binwhere.sg/api/v1/nearby');
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  // No Origin and no Referer: this is exactly how the native app calls the API.
  return new NextRequest(url, {
    headers: { 'cf-connecting-ip': ip, 'x-forwarded-for': ip },
  });
}

// Ang Mo Kio town centre — a real HDB estate with every channel within reach.
const ANG_MO_KIO = { lat: '1.3691', lng: '103.8454' };

async function main() {
  for (const channel of NearbyChannelSchema.options) {
    await runTest(`GET nearby channel=${channel} answers 200 with a v1 response`, async () => {
      const response = await GET(request({ ...ANG_MO_KIO, channel, radius: '5', limit: '20' }));
      assert.equal(response.status, 200);
      const body = NearbyResponseSchema.parse(await response.json());
      assert.equal(body.channel, channel);
      assert.equal(body.count, body.results.length);
      assert.equal(body.radiusKm, 5);
      for (const point of body.results) {
        assert.ok(point.distanceKm <= 5, `${point.name} is ${point.distanceKm} km away`);
      }
    });
  }

  await runTest('blue bins exist within the default 1 km of an HDB town', async () => {
    const response = await GET(request({ ...ANG_MO_KIO, channel: 'blue_bin' }));
    assert.equal(response.status, 200);
    const body = NearbyResponseSchema.parse(await response.json());
    assert.equal(body.radiusKm, 1, 'default radius');
    assert.equal(body.results.length, Math.min(body.count, 5), 'default limit');
    assert.ok(body.count > 0, 'Ang Mo Kio has blue bins');
  });

  await runTest('return points expose current locations without static machine status', async () => {
    const response = await GET(request({
      ...ANG_MO_KIO,
      channel: 'return_point',
      radius: '5',
      limit: '20',
    }));
    assert.equal(response.status, 200);
    const body = NearbyResponseSchema.parse(await response.json());
    assert.ok(body.results.length > 0, 'Ang Mo Kio has BCRS return points');
    for (const point of body.results) {
      assert.ok(point.address, `${point.name} has no address`);
      assert.ok(point.postalCode, `${point.name} has no postal code`);
      assert.equal(
        point.address.split(point.postalCode).length - 1,
        1,
        `${point.name} does not contain exactly one postal code`,
      );
      if (point.openingHours) {
        assert.equal(/\s{2,}/.test(point.openingHours), false, `${point.name} has untrimmed hours`);
      }
      assert.equal(point.machineStatus, undefined);
    }
  });

  await runTest('a position outside Singapore is a v1 INVALID_INPUT error', async () => {
    const response = await GET(request({ lat: '22.3193', lng: '114.1694', channel: 'blue_bin' }));
    assert.equal(response.status, 400);
    const body = ApiErrorResponseSchema.parse(await response.json());
    assert.equal(body.code, 'INVALID_INPUT');
  });

  await runTest('a missing channel is a v1 INVALID_INPUT error', async () => {
    const response = await GET(request(ANG_MO_KIO));
    assert.equal(response.status, 400);
    assert.equal(ApiErrorResponseSchema.parse(await response.json()).code, 'INVALID_INPUT');
  });

  await runTest('a limit above the v1 maximum is rejected, not clamped', async () => {
    const response = await GET(request({ ...ANG_MO_KIO, channel: 'blue_bin', limit: '21' }));
    assert.equal(response.status, 400);
    assert.equal(ApiErrorResponseSchema.parse(await response.json()).code, 'INVALID_INPUT');
  });

  console.log('All nearby route tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
