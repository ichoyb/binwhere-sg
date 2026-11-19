import assert from 'node:assert/strict';
import { t } from '@binwhere/core';
import { ApiError, parseRetryAfter } from '../api/client';
import { getMobileError, rateLimitMessage } from './api-error';

for (const [raw, seconds] of [
  [null, null], ['0', 0], ['40', 40], ['10800', 10800], ['-1', null], ['1.5', null],
  ['Thu, 12 Nov 2026 12:00:00 GMT', null], ['', null], ['40s', null], [' 40 ', null],
] as const) assert.equal(parseRetryAfter(raw), seconds);

for (const [seconds, key, n, en, zh] of [
  [null, 'error.rateLimited', undefined, 'Usage limit reached for now. Please try again later.', '暂时达到使用上限，请稍后再试。'],
  [0, 'error.rateLimited', undefined, 'Usage limit reached for now. Please try again later.', '暂时达到使用上限，请稍后再试。'],
  [40, 'error.rateLimitedSeconds', 40, 'Usage limit reached for now. Please try again in about 40 s.', '暂时达到使用上限，请约 40 秒后再试。'],
  [61, 'error.rateLimitedMinutes', 2, 'Usage limit reached for now. Please try again in about 2 min.', '暂时达到使用上限，请约 2 分钟后再试。'],
  [3600, 'error.rateLimitedHours', 1, 'Usage limit reached for now. Please try again in about 1 h.', '暂时达到使用上限，请约 1 小时后再试。'],
  [10800, 'error.rateLimitedHours', 3, 'Usage limit reached for now. Please try again in about 3 h.', '暂时达到使用上限，请约 3 小时后再试。'],
] as const) {
  assert.deepEqual(rateLimitMessage(seconds), n === undefined ? { key } : { key, n });
  const error = new ApiError(429, 'RATE_LIMITED', 'unused', seconds);
  assert.equal(getMobileError(error, 'en'), en);
  assert.equal(getMobileError(error, 'zh'), zh);
  assert.equal(t('en', key).replace('{n}', String(n)), en);
}
assert.deepEqual(rateLimitMessage(59), { key: 'error.rateLimitedSeconds', n: 59 });
assert.deepEqual(rateLimitMessage(60), { key: 'error.rateLimitedMinutes', n: 1 });
assert.deepEqual(rateLimitMessage(3599), { key: 'error.rateLimitedMinutes', n: 60 });
assert.equal(getMobileError(new ApiError(0, 'NETWORK_ERROR', 'unused'), 'en'), t('en', 'error.networkError'));
assert.equal(getMobileError(new Error('unknown'), 'zh'), t('zh', 'error.generic'));
assert.equal(getMobileError('Network Error', 'en'), t('en', 'error.networkError'));
console.log('PASS Retry-After parsing, full English/Chinese rate-limit copy and existing error mappings');
