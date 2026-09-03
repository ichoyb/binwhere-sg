import assert from 'node:assert/strict';

import { getClientIp } from './http-utils';
import { clientId, gridCell, logEvent } from './telemetry';

/**
 * Tests for the event layer.
 *
 * Two properties matter enough to pin down: the privacy guarantees (a raw IP or
 * an exact coordinate must never reach a log line) and the falsy-field
 * handling, because `results: 0` and `ok: false` are precisely the signals this
 * layer exists to capture — a truthiness check would drop both.
 */

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

/** Minimal Request stand-in: only headers are read. */
function req(headers: Record<string, string>): Request {
  return {
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as Request;
}

/** Run fn with console.log captured, returning the emitted lines. */
function capture(fn: () => void): string[] {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines;
}

runTest('gridCell rounds to a ~1km cell', () => {
  assert.equal(gridCell(1.3691, 103.8454), '1.37,103.85');
  assert.equal(gridCell(1.3649, 103.8412), '1.36,103.84');
});

runTest('gridCell keeps two decimals for exact values', () => {
  assert.equal(gridCell(1.3, 103.8), '1.30,103.80');
});

runTest('gridCell collapses distinct points inside one cell', () => {
  // Cell boundaries are fixed, so nearby points can still land either side of
  // one; what must hold is that points sharing a cell become indistinguishable.
  assert.equal(gridCell(1.3651, 103.8451), gridCell(1.3749, 103.8549));
});

runTest('gridCell never emits more than two decimals', () => {
  // The real guarantee: no output can be resolved finer than ~1.1 km.
  for (const [lat, lng] of [[1.36912345, 103.84543210], [1.3, 103.8]]) {
    assert.match(gridCell(lat, lng), /^\d+\.\d{2},\d+\.\d{2}$/);
  }
});

runTest('getClientIp uses Cloudflare client identity', () => {
  const ip = getClientIp(req({ 'cf-connecting-ip': '203.0.113.7' }));
  assert.equal(ip, '203.0.113.7');
});

runTest('getClientIp ignores caller-controlled forwarding headers', () => {
  assert.equal(getClientIp(req({
    'x-forwarded-for': '203.0.113.7, 172.16.0.1',
    'x-real-ip': '198.51.100.4',
  })), 'unknown');
  assert.equal(getClientIp(req({})), 'unknown');
});

runTest('getClientIp prefers Cloudflare over a forged forwarding chain', () => {
  const ip = getClientIp(req({
    'cf-connecting-ip': '198.51.100.4',
    'x-forwarded-for': '203.0.113.7, 172.16.0.1',
  }));
  assert.equal(ip, '198.51.100.4');
});

runTest('clientId is stable for the same IP', () => {
  const a = clientId(req({ 'cf-connecting-ip': '203.0.113.7' }));
  const b = clientId(req({ 'cf-connecting-ip': '203.0.113.7' }));
  assert.equal(a, b);
});

runTest('clientId differs across IPs', () => {
  const a = clientId(req({ 'cf-connecting-ip': '203.0.113.7' }));
  const b = clientId(req({ 'cf-connecting-ip': '203.0.113.8' }));
  assert.notEqual(a, b);
});

runTest('clientId never contains the raw IP', () => {
  const id = clientId(req({ 'cf-connecting-ip': '203.0.113.7' }));
  assert.ok(!id.includes('203.0.113.7'));
  assert.match(id, /^[0-9a-f]{12}$/);
});

runTest('logEvent emits one parseable JSON line with t and evt', () => {
  const [line] = capture(() => logEvent('nearby', { channel: 'blue_bin' }));
  assert.ok(line.startsWith('[evt] '));
  const parsed = JSON.parse(line.slice('[evt] '.length));
  assert.equal(parsed.evt, 'nearby');
  assert.equal(parsed.channel, 'blue_bin');
  assert.ok(!Number.isNaN(Date.parse(parsed.t)));
});

runTest('logEvent keeps falsy-but-meaningful fields', () => {
  const [line] = capture(() =>
    logEvent('nearby', { ok: false, results: 0, ms: 0 }),
  );
  const parsed = JSON.parse(line.slice('[evt] '.length));
  assert.equal(parsed.ok, false);
  assert.equal(parsed.results, 0);
  assert.equal(parsed.ms, 0);
});

runTest('logEvent keeps null, which means "empty" not "absent"', () => {
  const [line] = capture(() => logEvent('classify', { channel: null }));
  const parsed = JSON.parse(line.slice('[evt] '.length));
  assert.ok('channel' in parsed);
  assert.equal(parsed.channel, null);
});

runTest('logEvent drops undefined fields', () => {
  const [line] = capture(() =>
    logEvent('classify', { channel: 'blue_bin', locale: undefined }),
  );
  const parsed = JSON.parse(line.slice('[evt] '.length));
  assert.ok(!('locale' in parsed));
});
