import assert from 'node:assert/strict';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { mock } from 'node:test';
import { NextRequest } from 'next/server';
import { ApiV2ErrorResponseSchema, RouteResponseSchema } from '@binwhere/core';
import { checkRateLimit, DEFAULT_LIMITS, POINTS_LIMITS } from '@/lib/rate-limit';
import { gridCell } from '@/lib/telemetry';
import { POST } from './route';

const INPUT = {
  origin: { lat: 1.369123, lng: 103.845456 },
  destination: { lat: 1.367978, lng: 103.844373 },
};
const VERSION = 'a'.repeat(64);
const UPSTREAM = {
  code: 'Ok',
  data_version: `${VERSION}@2026-11-01T21:21:36Z`,
  routes: [{
    distance: 338.7,
    duration: 243.9,
    geometry: { type: 'LineString', coordinates: [[103.845411, 1.3691], [103.844379, 1.367981]] },
  }],
  waypoints: [
    { location: [103.845411, 1.3691], distance: 5.6 },
    { location: [103.844379, 1.367981], distance: 0.8 },
  ],
};

type Event = Record<string, string | number | boolean>;
let clientCounter = 0;

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return address.port;
}

async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function assertEvent(event: Event, status: number, code?: string, cells = true) {
  assert.equal(event.evt, 'route');
  assert.equal(event.http, status);
  assert.equal(event.ok, status === 200);
  assert.equal(event.code, code);
  assert.ok(typeof event.ms === 'number' && event.ms >= 0);
  assert.match(event.client as string, /^[a-f0-9]{12}$/);
  assert.equal(event.originCell, cells ? gridCell(INPUT.origin.lat, INPUT.origin.lng) : undefined);
  assert.equal(event.destinationCell, cells ? gridCell(INPUT.destination.lat, INPUT.destination.lng) : undefined);
  const text = JSON.stringify(event);
  for (const value of Object.values(INPUT).flatMap(Object.values)) assert.ok(!text.includes(String(value)), text);
  for (const key of ['geometry', 'distanceM', 'durationS', 'lat', 'lng', 'ip', 'name']) assert.ok(!(key in event));
}

async function main() {
  let reply: unknown = UPSTREAM;
  let http = 200;
  let mode: 'reply' | 'hold' | 'headers-timeout' | 'body-timeout' = 'reply';
  let calls = 0;
  const held: ServerResponse[] = [];
  let bothHeld = () => {};
  const timers: ReturnType<typeof setTimeout>[] = [];
  const upstream = createServer(async (request, response) => {
    calls++;
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '/route/v1/foot');
    assert.equal(request.headers['content-type'], 'application/json');
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk);
    assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()), {
      coordinates: [[INPUT.origin.lng, INPUT.origin.lat], [INPUT.destination.lng, INPUT.destination.lat]],
      radiuses: [50, 50], overview: 'full', geometries: 'geojson',
    });
    if (mode === 'hold') {
      held.push(response);
      if (held.length === 2) bothHeld();
      return;
    }
    if (mode === 'headers-timeout') return;
    if (mode === 'body-timeout') {
      timers.push(setTimeout(() => {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.flushHeaders();
        timers.push(setTimeout(() => response.end(JSON.stringify(UPSTREAM)), 1200));
      }, 1200));
      return;
    }
    response.writeHead(http, { 'Content-Type': 'application/json' });
    response.end(typeof reply === 'string' ? reply : JSON.stringify(reply));
  });
  const api = createServer(async (request, response) => {
    const headers = new Headers();
    for (let i = 0; i < request.rawHeaders.length; i += 2) {
      headers.append(request.rawHeaders[i], request.rawHeaders[i + 1]);
    }
    const input = new Request('https://binwhere.sg/api/v2/route', {
      method: 'POST', headers, body: Readable.toWeb(request), duplex: 'half',
    } as RequestInit);
    const result = await POST(new NextRequest(input));
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
  });
  const originalPort = process.env.BINWHERE_ROUTING_PORT;
  const events: Event[] = [];
  const errors: unknown[] = [];
  const logger = mock.method(console, 'log', (line: string) => {
    if (line.startsWith('[evt] ')) events.push(JSON.parse(line.slice(6)));
  });
  const errorLogger = mock.method(console, 'error', (...args: unknown[]) => errors.push(args));
  try {
    const port = await listen(upstream);
    process.env.BINWHERE_ROUTING_PORT = String(port);
    const apiUrl = `http://127.0.0.1:${await listen(api)}/api/v2/route`;
    const request = (body = JSON.stringify(INPUT), headers: Record<string, string> = {}) => fetch(apiUrl, {
      method: 'POST', body,
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': `198.51.100.${++clientCounter}`, ...headers },
    });
    const check = async (status: number, code?: string, body?: string, headers?: Record<string, string>, cells = true) => {
      const start = events.length;
      const response = await request(body, headers);
      assert.equal(response.status, status);
      assert.equal(events.length - start, 1, `HTTP ${status} emits one event`);
      assertEvent(events[start], status, code, cells);
      if (code) assert.equal(ApiV2ErrorResponseSchema.parse(await response.clone().json()).code, code);
      return response;
    };

    const success = RouteResponseSchema.parse(await (await check(200)).json());
    assert.deepEqual(success, {
      geometry: UPSTREAM.routes[0].geometry,
      distanceM: 338.7, durationS: 243.9,
      snappedOrigin: { lat: 1.3691, lng: 103.845411, offsetM: 5.6 },
      snappedDestination: { lat: 1.367981, lng: 103.844379, offsetM: 0.8 },
      roadNetworkVersion: VERSION, osmDataTimestamp: '2026-11-01T21:21:36Z',
    });
    assert.equal(events.at(-1)?.roadNetworkVersion, VERSION);
    await check(200, undefined, `${JSON.stringify(INPUT)}${' '.repeat(2048 - Buffer.byteLength(JSON.stringify(INPUT)))}`,
      { 'Content-Type': 'application/json; charset=utf-8' });
    process.stdout.write('PASS HTTP 200 contract, POST-only upstream coordinates, 50 m radius and 2048-byte boundary\n');

    const beforeInvalid = calls;
    for (const body of ['{', '{}', JSON.stringify({ ...INPUT, origin: { lat: 0, lng: 103.8 } }),
      JSON.stringify({ ...INPUT, destination: { lat: 1.36, lng: 105 } }), `${JSON.stringify(INPUT)}${' '.repeat(2048)}`,
      JSON.stringify({ ...INPUT, padding: '中'.repeat(700) })]) {
      await check(400, 'INVALID_INPUT', body, undefined, false);
    }
    await check(400, 'INVALID_INPUT', undefined, { 'Content-Type': 'text/plain' }, false);
    assert.equal(calls, beforeInvalid);

    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls++;
        controller.enqueue(new Uint8Array(1024));
        if (pulls === 20) controller.close();
      },
    }, { highWaterMark: 0 });
    const streamed = new NextRequest(new Request(apiUrl, {
      method: 'POST', body: stream, duplex: 'half',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.241' },
    } as RequestInit));
    const eventStart = events.length;
    assert.equal((await POST(streamed)).status, 400);
    assert.ok(pulls < 20, 'oversized stream is rejected before the complete body is read');
    assert.equal(events.length - eventStart, 1);
    assertEvent(events[eventStart], 400, 'INVALID_INPUT', false);
    await streamed.body?.cancel();
    process.stdout.write('PASS HTTP 400 malformed/missing/outside/size/media type; streaming reader stops early\n');

    await check(403, 'FORBIDDEN', undefined, { origin: 'https://attacker.example' }, false);
    await check(403, 'FORBIDDEN', undefined, { referer: 'https://attacker.example/page' }, false);
    await check(200, undefined, undefined, { origin: 'https://binwhere.sg' });
    const ip = '192.0.2.240';
    for (let i = 0; i < 10; i++) await check(200, undefined, undefined, { 'CF-Connecting-IP': ip });
    const limited = await check(429, 'RATE_LIMITED', undefined, { 'CF-Connecting-IP': ip }, false);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.ok(Number(limited.headers.get('retry-after')) <= 60);
    for (const [path, limits] of [['/api/v2/points', POINTS_LIMITS], ['/api/v1/nearby', DEFAULT_LIMITS],
      ['/api/v1/classify', DEFAULT_LIMITS]] as const) {
      assert.equal(checkRateLimit(new NextRequest(`https://binwhere.sg${path}`, { headers: { 'CF-Connecting-IP': ip } }), limits), null);
    }
    process.stdout.write('PASS HTTP 403 access policy and 429 tenth/eleventh boundary with independent buckets\n');

    http = 400;
    for (const [osrm, code] of [['NoSegment', 'ROUTE_NOT_ON_NETWORK'], ['NoRoute', 'ROUTE_NOT_FOUND']]) {
      reply = { code: osrm };
      await check(422, code);
      assert.equal(events.at(-1)?.roadNetworkVersion, undefined);
    }
    process.stdout.write('PASS both HTTP 422 results without data_version\n');

    for (const status of [200, 400, 500]) {
      http = status;
      reply = { code: 'InvalidOptions', message: JSON.stringify(INPUT) };
      await check(502, 'INVALID_RESPONSE');
    }
    http = 200;
    for (const invalid of ['not json', null, {}, { ...UPSTREAM, routes: [] },
      { ...UPSTREAM, data_version: undefined }, { ...UPSTREAM, data_version: `${VERSION}@2026-02-30T00:00:00Z` },
      { ...UPSTREAM, data_version: 'invalid' }, { ...UPSTREAM, data_version: `${VERSION}@2026-11-01T21:21:36Z@extra` },
      { ...UPSTREAM, waypoints: [] }, { ...UPSTREAM, routes: [{ ...UPSTREAM.routes[0], distance: -1 }] },
      { ...UPSTREAM, routes: [{ ...UPSTREAM.routes[0], geometry: { type: 'LineString', coordinates: [[103, 1]] } }] }]) {
      reply = invalid;
      await check(502, 'INVALID_RESPONSE');
    }
    assert.equal(errors.length, 0);
    process.stdout.write('PASS HTTP 502 OSRM/HTTP/JSON/fields/version/output-schema failures never print upstream bodies\n');

    reply = UPSTREAM;
    for (const invalidPort of ['', 'https://example.com', '127.0.0.1:5000', '0', '65536']) {
      process.env.BINWHERE_ROUTING_PORT = invalidPort;
      const invalid = await check(503, 'ROUTING_UNAVAILABLE');
      assert.match((await invalid.json()).error, /BINWHERE_ROUTING_PORT/);
    }
    process.env.BINWHERE_ROUTING_PORT = String(port);

    mode = 'hold';
    const waiting = new Promise<void>((resolve) => { bothHeld = resolve; });
    const concurrentStart = events.length;
    const first = request();
    const second = request();
    await waiting;
    const beforeBusy = calls;
    const busy = await request();
    assert.equal(busy.status, 503);
    assert.equal((await busy.json()).code, 'SERVER_BUSY');
    assert.equal(calls, beforeBusy, 'third request never reaches OSRM');
    held.forEach((response) => response.end(JSON.stringify(UPSTREAM)));
    assert.deepEqual((await Promise.all([first, second])).map((response) => response.status), [200, 200]);
    const concurrentEvents = events.slice(concurrentStart);
    assert.equal(concurrentEvents.length, 3);
    assert.equal(new Set(concurrentEvents.map((event) => event.client)).size, 3);
    assert.deepEqual(concurrentEvents.map((event) => [event.http, event.code]), [
      [503, 'SERVER_BUSY'], [200, undefined], [200, undefined],
    ]);
    for (const event of concurrentEvents) assertEvent(event, event.http as number, event.code as string | undefined);
    process.stdout.write('PASS HTTP 503 invalid loopback port and third concurrent request rejected without queue\n');

    for (const timeoutMode of ['headers-timeout', 'body-timeout'] as const) {
      mode = timeoutMode;
      const start = Date.now();
      await check(504, 'ROUTING_TIMEOUT');
      assert.ok(Date.now() - start >= 1900);
      assert.ok(Date.now() - start < 2600);
      mode = 'reply';
      await check(200);
    }
    process.stdout.write('PASS HTTP 504 deadline includes headers and body; slots released after timeout\n');

    await close(upstream);
    await check(503, 'ROUTING_UNAVAILABLE');
    assert.equal(errors.length, 0);
    process.stdout.write('PASS HTTP 503 stopped service; every outcome emits exactly one private event\n');
  } finally {
    for (const timer of timers) clearTimeout(timer);
    if (api.listening) await close(api);
    if (upstream.listening) await close(upstream);
    if (originalPort === undefined) delete process.env.BINWHERE_ROUTING_PORT;
    else process.env.BINWHERE_ROUTING_PORT = originalPort;
    logger.mock.restore();
    errorLogger.mock.restore();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
