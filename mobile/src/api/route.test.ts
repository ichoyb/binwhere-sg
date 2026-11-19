import assert from 'node:assert/strict';
import { ApiV2Error, fetchRoute, RouteNetworkError, setContractViolationReporter, type ContractViolation } from './client';

const request = { origin: { lat: 1.3691, lng: 103.8454 }, destination: { lat: 1.367978, lng: 103.844373 } };
const response = {
  geometry: { type: 'LineString', coordinates: [[103.8454, 1.3691], [103.844373, 1.367978]] },
  distanceM: 339, durationS: 244,
  snappedOrigin: { ...request.origin, offsetM: 3 }, snappedDestination: { ...request.destination, offsetM: 16 },
  roadNetworkVersion: 'a'.repeat(64), osmDataTimestamp: '2026-11-01T00:00:00Z',
};
const originalFetch = globalThis.fetch;
const reports: ContractViolation[] = [];
setContractViolationReporter((violation) => reports.push(violation));

function privateFailure(error: unknown): boolean {
  assert.ok(error instanceof Error);
  const serialized = JSON.stringify({ error, message: error.message, stack: error.stack, reports });
  for (const coordinate of ['1.3691', '103.8454', '1.367978', '103.844373']) {
    assert.ok(!serialized.includes(coordinate), serialized);
  }
  return true;
}

async function main() {
  try {
    const controller = new AbortController();
    globalThis.fetch = async (url, init) => {
      assert.ok(String(url).endsWith('/api/v2/route'));
      assert.ok(!String(url).includes('?'));
      assert.equal(init?.method, 'POST');
      assert.deepEqual(init?.headers, { 'Content-Type': 'application/json' });
      assert.deepEqual(JSON.parse(init!.body as string), request);
      assert.equal(init?.signal, controller.signal);
      return new Response(JSON.stringify(response));
    };
    assert.deepEqual(await fetchRoute(request, controller.signal), response);
    assert.deepEqual(reports, []);
    console.log('PASS route validates and posts JSON, forwards cancellation and parses the v2 response');

    globalThis.fetch = async () => assert.fail('invalid input must not fetch');
    await assert.rejects(fetchRoute({ ...request, origin: { lat: 103.8454, lng: 1.3691 } }),
      (error) => privateFailure(error) && error instanceof ApiV2Error && error.code === 'INVALID_INPUT');

    for (const [status, body] of [
      [200, { ...response, geometry: { type: '1.3691,103.8454', coordinates: '1.367978,103.844373' } }],
      [503, { code: '1.3691,103.8454', error: '1.367978,103.844373' }],
      [200, '1.3691 103.8454 1.367978 103.844373'],
      [503, '1.3691 103.8454 1.367978 103.844373'],
    ] as const) {
      reports.length = 0;
      globalThis.fetch = async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
      await assert.rejects(fetchRoute(request), (error) => privateFailure(error)
        && error instanceof ApiV2Error && error.code === 'INVALID_RESPONSE'
        && error.status === (status === 200 ? 502 : status));
      assert.deepEqual(reports, [{ endpoint: 'route', status, issues: ['<body>: invalid route response'] }]);
    }
    console.log('PASS malformed success and error responses preserve safe contract reports and HTTP error status without coordinates');

    for (const [body, header, seconds] of [
      ['{"code":"RATE_LIMITED","error":103.8454}', '40', 40],
      ['{"code":"RATE_LIMITED","error":"Limited"}', '10800', 10800],
      ['<html>edge rate limit</html>', null, null],
    ] as const) {
      reports.length = 0;
      globalThis.fetch = async () => new Response(body, { status: 429,
        headers: header === null ? {} : { 'Retry-After': header } });
      await assert.rejects(fetchRoute(request), (error) => privateFailure(error)
        && error instanceof ApiV2Error && error.code === 'RATE_LIMITED' && error.status === 429
        && error.retryAfterSeconds === seconds);
      assert.deepEqual(reports, []);
    }
    console.log('PASS route 429 ignores malformed and edge bodies, preserves wait seconds and reports nothing');

    reports.length = 0;
    globalThis.fetch = async () => new Response(JSON.stringify({ code: 'FORBIDDEN', error: '1.3691 103.8454 1.367978 103.844373' }), { status: 403 });
    await assert.rejects(fetchRoute(request), (error) => privateFailure(error)
      && error instanceof ApiV2Error && error.code === 'FORBIDDEN' && error.status === 403);
    assert.deepEqual(reports, []);
    globalThis.fetch = async () => { throw new Error('Network 1.3691 103.8454'); };
    await assert.rejects(fetchRoute(request), (error) => privateFailure(error) && error instanceof RouteNetworkError);
    console.log('PASS server and network error messages cannot leak coordinates');

    globalThis.fetch = async () => {
      controller.abort('1.3691 103.8454');
      throw new Error('1.367978 103.844373');
    };
    await assert.rejects(fetchRoute(request, controller.signal), (error) => privateFailure(error)
      && error instanceof Error && error.name === 'AbortError');
    const bodyController = new AbortController();
    globalThis.fetch = async () => {
      const body = new Response();
      body.json = async () => { bodyController.abort(); throw new Error('1.3691 103.8454'); };
      return body;
    };
    await assert.rejects(fetchRoute(request, bodyController.signal), (error) => privateFailure(error)
      && error instanceof Error && error.name === 'AbortError');
    const completedBodyController = new AbortController();
    globalThis.fetch = async () => {
      const body = new Response();
      body.json = async () => { completedBodyController.abort(); return { invalid: true }; };
      return body;
    };
    await assert.rejects(fetchRoute(request, completedBodyController.signal), (error) => privateFailure(error)
      && error instanceof Error && error.name === 'AbortError');
    assert.deepEqual(reports, []);
    console.log('PASS cancelled fetch and body reads stay private and are not contract violations');
  } finally {
    globalThis.fetch = originalFetch;
    setContractViolationReporter(() => {});
  }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
