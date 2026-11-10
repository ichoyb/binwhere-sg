import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mock } from 'node:test';
import { gunzipSync, gzipSync } from 'node:zlib';
import { NextRequest } from 'next/server';
import {
  ApiV2ErrorResponseSchema,
  PointsLayerSchema,
  PointsResponseSchema,
  isSingaporeCoordinates,
} from '@binwhere/core';
import { getPointsData } from '@/lib/points';
import { checkRateLimit, DEFAULT_LIMITS, POINTS_LIMITS } from '@/lib/rate-limit';
import { GET } from './route';

const FILES = {
  blue_bin: 'recycling-bins',
  return_point: 'return-points',
  ewaste: 'ewaste-recycling-points',
  textile: 'textile-bins',
  donation: 'reuse-channels',
};

let counter = 0;

async function call(status: number, headers: Record<string, string> = {}) {
  const ip = headers['cf-connecting-ip'] ?? `198.51.100.${++counter}`;
  const events: Record<string, unknown>[] = [];
  const logger = mock.method(console, 'log', (message: string) => {
    if (message.startsWith('[evt] ')) events.push(JSON.parse(message.slice(6)));
  });
  let response;
  try {
    response = await GET(new NextRequest('https://binwhere.sg/api/v2/points', {
      headers: { 'cf-connecting-ip': ip, ...headers },
    }));
  } finally {
    logger.mock.restore();
  }
  assert.equal(response.status, status);
  assert.equal(events.length, 1, `HTTP ${status} emits exactly one event`);
  assert.equal(events[0].evt, 'points');
  assert.equal(events[0].http, status);
  assert.equal(events[0].ok, status < 400);
  assert.match(events[0].client as string, /^[a-f0-9]{12}$/);
  assert.equal(JSON.stringify(events).includes(ip), false);
  for (const key of ['lat', 'lng', 'cell', 'ip']) assert.equal(key in events[0], false);
  if (status >= 400) {
    const body = ApiV2ErrorResponseSchema.parse(await response.clone().json());
    assert.equal(body.code, events[0].code);
  }
  return response;
}

async function main() {
  const directory = mock.method(process, 'cwd', () => join(process.env.ZLCREW_SCRATCH ?? '/tmp', 'missing-points-test-data'));
  try {
    const response = await call(503);
    assert.equal((await response.json()).code, 'POINTS_DATA_UNAVAILABLE');
  } finally {
    directory.mock.restore();
  }
  console.log('PASS unavailable data returns 503 and one event');

  const response = await call(200);
  const text = await response.text();
  const body = PointsResponseSchema.parse(JSON.parse(text));
  const ids = new Set<string>();
  for (const layer of PointsLayerSchema.options) {
    const source = JSON.parse(gunzipSync(readFileSync(join('data', 'geo-snapshot', `${FILES[layer]}.json.gz`))).toString());
    assert.equal(body.layers[layer].length, source.features.length, `${layer} retains every source row`);
    for (const [index, row] of body.layers[layer].entries()) {
      assert.ok(isSingaporeCoordinates(row[0], row[1]));
      assert.equal(row[0], source.features[index].geometry.coordinates[1]);
      assert.equal(row[1], source.features[index].geometry.coordinates[0]);
      ids.add(`${layer}:${index}`);
    }
  }
  assert.equal(ids.size, Object.values(body.layers).reduce((sum, rows) => sum + rows.length, 0));
  const expectedVersion = createHash('sha256').update(readFileSync('data/geo-snapshot/data-manifest.json')).digest('hex');
  assert.equal(body.dataVersion, expectedVersion);
  const bodyHash = createHash('sha256').update(text).digest('hex');
  assert.equal(response.headers.get('etag'), `W/"${bodyHash}"`);
  assert.equal(response.headers.get('cache-control'), 'private, no-cache');
  assert.ok(gzipSync(text).length <= 400_000);
  assert.equal(await (await call(200)).text(), text);
  console.log('PASS all five layers match snapshots, coordinates and implicit ids repeat, gzip <= 400 KB');

  const upgraded = await call(200, { 'if-none-match': `W/"${expectedVersion}"` });
  const upgradedBody = PointsResponseSchema.parse(await upgraded.json());
  assert.deepEqual(upgradedBody, body);
  assert.equal(upgradedBody.ewasteAccepts!.length, body.layers.ewaste.length);
  console.log('PASS manifest-based legacy ETag receives 200 with the complete response and e-waste kinds');

  for (const tag of [response.headers.get('etag')!, `"older", ${response.headers.get('etag')}`, `"${bodyHash}"`, '*']) {
    const unchanged = await call(304, { 'if-none-match': tag });
    assert.equal(await unchanged.text(), '');
    assert.equal(unchanged.headers.get('etag'), response.headers.get('etag'));
    assert.equal(unchanged.headers.get('cache-control'), 'private, no-cache');
  }
  assert.equal(await (await call(200, { 'if-none-match': '"older"' })).text(), text);
  console.log('PASS matching validators return empty 304; changed validator returns 200');

  const forbidden = await call(403, { origin: 'https://attacker.example' });
  assert.equal((await forbidden.json()).code, 'FORBIDDEN');
  assert.equal((await (await call(403, { referer: 'https://attacker.example/page' })).json()).code, 'FORBIDDEN');
  await call(200, { origin: 'https://binwhere.sg' });
  console.log('PASS access control uses the existing Origin/Referer policy');

  const ip = '198.51.100.200';
  for (let i = 0; i < POINTS_LIMITS.perIp[0].max; i++) await call(200, { 'cf-connecting-ip': ip });
  const limited = await call(429, { 'cf-connecting-ip': ip });
  assert.equal((await limited.json()).code, 'RATE_LIMITED');
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.ok(Number(limited.headers.get('retry-after')) <= 60);
  for (const path of ['nearby', 'classify']) {
    assert.equal(checkRateLimit(new NextRequest(`https://binwhere.sg/api/v1/${path}`, {
      headers: { 'cf-connecting-ip': ip },
    }), DEFAULT_LIMITS), null);
  }
  console.log('PASS seventh request is 429 with Retry-After; v1 buckets remain available');

  const data = getPointsData();
  const originalName = data.layers.ewaste[0][2];
  data.layers.ewaste[0][2] = `${originalName} changed`;
  try {
    const changed = await call(200, { 'if-none-match': response.headers.get('etag')! });
    const changedText = await changed.text();
    assert.equal(JSON.parse(changedText).dataVersion, expectedVersion);
    assert.notEqual(changed.headers.get('etag'), response.headers.get('etag'));
    assert.equal(changed.headers.get('etag'), `W/"${createHash('sha256').update(changedText).digest('hex')}"`);
  } finally {
    data.layers.ewaste[0][2] = originalName;
  }
  console.log('PASS response changes invalidate the body ETag while dataVersion stays the same');

  const original = data.layers.blue_bin[0][0];
  data.layers.blue_bin[0][0] = 90;
  try {
    const invalid = await call(502);
    assert.equal((await invalid.json()).code, 'INVALID_RESPONSE');
  } finally {
    data.layers.blue_bin[0][0] = original;
  }
  console.log('PASS invalid output returns 502 and one event');
  console.log('All points route tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
