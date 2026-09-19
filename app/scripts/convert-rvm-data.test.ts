import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  BCRS_QUERY_RADIUS_METERS,
  convertRvmPayload,
  createCoverageGrid,
  deriveCoverageBounds,
  fetchAndConvertRvmData,
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

async function testPublicMapTokenLifecycle(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'binwhere-rvm-test-'));
  let now = 1_800_000_000_000;
  let tokenRequests = 0;
  let nearbyRequests = 0;
  let activeRefreshes = 0;
  let maximumRefreshes = 0;
  let invalidExpiry = false;
  let retryTriggered = false;
  const expirations = new Map<string, number>();
  const records = Array.from({ length: 1_000 }, (_, id) => location({ id: id + 1 }));
  Date.now = () => now;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === '/px/SGRegionGeo.json') {
      return Response.json({ SearchResults: [{ geojson: {
        type: 'Polygon',
        coordinates: [[[103.8, 1.2], [103.84, 1.24], [103.8, 1.2]]],
      } }] });
    }
    if (url.pathname === '/px-api/public/config/rvm_map_config') {
      return Response.json({ status: 'success', data: { nearbyRadius: 2_000 } });
    }
    if (url.pathname === '/px-api/locations/access-token') {
      tokenRequests++;
      activeRefreshes++;
      maximumRefreshes = Math.max(maximumRefreshes, activeRefreshes);
      await new Promise((resolve) => setImmediate(resolve));
      activeRefreshes--;
      const token = `test-token-${tokenRequests}`;
      // A normal 60-second token has already lost a few milliseconds in transit.
      const expiresAt = now + (invalidExpiry ? -1 : 59_996);
      expirations.set(token, expiresAt);
      return Response.json({ status: 'success', data: { token, expiresAt } });
    }
    assert.equal(url.pathname, '/px-api/locations/nearby', 'must not request a map UUID');
    assert.equal(url.searchParams.get('radius'), '2000');
    const token = new Headers(init?.headers).get('x-bcrs-map-token');
    assert.ok(token && (expirations.get(token) ?? 0) > now, 'must send an unexpired token');
    nearbyRequests++;
    await new Promise((resolve) => setImmediate(resolve));
    now += 11_000;
    if (!retryTriggered) {
      retryTriggered = true;
      return new Response('', { status: 503 });
    }
    return Response.json({ status: 'success', data: records });
  };

  try {
    const result = await fetchAndConvertRvmData(directory);
    assert.equal(result.featureCount, 1_000);
    assert.equal(nearbyRequests, result.queryCount + 1, 'one existing HTTP retry');
    assert.ok(tokenRequests >= 2, 'a long scan must refresh its initial token');
    assert.equal(maximumRefreshes, 1, 'concurrent workers must share token refresh');
    assert.equal(result.observationCount, result.queryCount * 1_000);
    assert.ok(!fs.readFileSync(result.outputPath, 'utf8').includes('test-token'));
    console.log('PASS full public-map scan renews short-lived tokens across workers and retries');

    fs.unlinkSync(result.outputPath);
    invalidExpiry = true;
    const previousNearbyRequests = nearbyRequests;
    await assert.rejects(fetchAndConvertRvmData(directory), /expires too soon/);
    assert.equal(nearbyRequests, previousNearbyRequests);
    assert.equal(fs.existsSync(result.outputPath), false);
    console.log('PASS expired access token fails the scan without publishing output');
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

testPublicMapTokenLifecycle().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
