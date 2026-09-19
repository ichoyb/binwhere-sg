import assert from 'node:assert/strict';

import { NextRequest } from 'next/server';

import { checkRateLimit, type RateLimitConfig } from './rate-limit';

const TEST_LIMITS: RateLimitConfig = {
  perIp: [{ windowMs: 60_000, max: 100 }],
};

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

function request(headers: Record<string, string>): NextRequest {
  return new NextRequest('https://binwhere.sg/api/v1/classify', { headers });
}

runTest('allows an exact production Origin', () => {
  const result = checkRateLimit(request({
    origin: 'https://binwhere.sg',
    'cf-connecting-ip': '192.0.2.1',
  }), TEST_LIMITS);
  assert.equal(result, null);
});

runTest('rejects a hostname that only starts with an allowed Origin', () => {
  const result = checkRateLimit(request({
    origin: 'https://binwhere.sg.attacker.example',
    'cf-connecting-ip': '192.0.2.2',
  }), TEST_LIMITS);
  assert.equal(result?.status, 403);
});

runTest('allows a Referer path on an exact production Origin', () => {
  const result = checkRateLimit(request({
    referer: 'https://www.binwhere.sg/classify?source=home',
    'cf-connecting-ip': '192.0.2.3',
  }), TEST_LIMITS);
  assert.equal(result, null);
});

runTest('rejects an allowed-Origin prefix in Referer', () => {
  const result = checkRateLimit(request({
    referer: 'https://binwhere.sg.attacker.example/classify',
    'cf-connecting-ip': '192.0.2.4',
  }), TEST_LIMITS);
  assert.equal(result?.status, 403);
});

runTest('rejects a malformed Referer', () => {
  const result = checkRateLimit(request({
    referer: 'not-a-url',
    'cf-connecting-ip': '192.0.2.5',
  }), TEST_LIMITS);
  assert.equal(result?.status, 403);
});

runTest('allows native clients without browser Origin headers', () => {
  const result = checkRateLimit(request({
    'cf-connecting-ip': '192.0.2.6',
  }), TEST_LIMITS);
  assert.equal(result, null);
});

runTest('nearby exhaustion does not consume the classification allowance', () => {
  const headers = { 'cf-connecting-ip': '192.0.2.70' };
  const limits = { perIp: [{ windowMs: 60_000, max: 2 }] };
  const nearby = () => new NextRequest('https://binwhere.sg/api/v1/nearby?limit=1', { headers });
  assert.equal(checkRateLimit(nearby(), limits), null);
  assert.equal(checkRateLimit(nearby(), limits), null);
  const blocked = checkRateLimit(nearby(), limits);
  assert.equal(blocked?.status, 429);
  assert.ok(Number(blocked?.headers.get('Retry-After')) > 0);
  assert.equal(checkRateLimit(request(headers), limits), null);
  assert.equal(checkRateLimit(request(headers), limits), null);
  assert.equal(checkRateLimit(request(headers), limits)?.status, 429);
});

runTest('global quotas are separate across API paths and shared across clients', () => {
  const limits = { perIp: [], global: [{ windowMs: 12_345, max: 1 }] };
  const nearby = new NextRequest('https://binwhere.sg/api/v1/nearby');
  assert.equal(checkRateLimit(nearby, limits), null);
  assert.equal(checkRateLimit(request({ 'cf-connecting-ip': '192.0.2.71' }), limits), null);
  assert.equal(checkRateLimit(request({ 'cf-connecting-ip': '192.0.2.72' }), limits)?.status, 429);
  assert.equal(checkRateLimit(nearby, limits)?.status, 429);
});
