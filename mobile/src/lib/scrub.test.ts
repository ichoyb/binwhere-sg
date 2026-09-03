import assert from 'node:assert/strict';
import {
  scrubBreadcrumb,
  scrubEvent,
  scrubUrl,
  type ScrubbableBreadcrumb,
  type ScrubbableEvent,
} from './scrub';

function run(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

run('scrubUrl blanks lat/lng and keeps the other nearby parameters', () => {
  assert.equal(
    scrubUrl('https://binwhere.sg/api/v1/nearby?lat=1.3691&lng=103.8454&channel=blue_bin&limit=20&radius=1'),
    'https://binwhere.sg/api/v1/nearby?lat=[redacted]&lng=[redacted]&channel=blue_bin&limit=20&radius=1',
  );
});

run('scrubUrl leaves URLs without a query untouched', () => {
  assert.equal(scrubUrl('https://binwhere.sg/api/v1/classify'), 'https://binwhere.sg/api/v1/classify');
});

run('scrubUrl is case-insensitive on keys and preserves fragments', () => {
  assert.equal(scrubUrl('https://x.test/p?LAT=1.3&foo=bar#frag'), 'https://x.test/p?LAT=[redacted]&foo=bar#frag');
});

run('scrubUrl does not touch keys that merely contain lat/lng', () => {
  assert.equal(scrubUrl('https://x.test/p?platform=ios&lng=103.8'), 'https://x.test/p?platform=ios&lng=[redacted]');
});

run('scrubBreadcrumb rewrites only the url field of fetch breadcrumbs', () => {
  const crumb = {
    category: 'fetch',
    data: { method: 'GET', url: 'https://binwhere.sg/api/v1/nearby?lat=1.3&lng=103.8&channel=ewaste', status_code: 200 },
  };
  const scrubbed = scrubBreadcrumb(crumb);
  assert.equal(scrubbed.data.url, 'https://binwhere.sg/api/v1/nearby?lat=[redacted]&lng=[redacted]&channel=ewaste');
  assert.equal(scrubbed.data.method, 'GET');
  assert.equal(scrubbed.data.status_code, 200);
  assert.equal(crumb.data.url.includes('1.3'), true, 'input must not be mutated');
});

run('scrubBreadcrumb passes breadcrumbs without a url through unchanged', () => {
  const crumb: ScrubbableBreadcrumb & { category: string; message: string } = { category: 'console', message: 'hello' };
  assert.equal(scrubBreadcrumb(crumb), crumb);
});

run('scrubEvent scrubs the request url and every breadcrumb', () => {
  const event = {
    message: 'boom',
    request: { url: 'https://binwhere.sg/api/v1/nearby?lat=1.3&lng=103.8' },
    breadcrumbs: [
      { data: { url: 'https://binwhere.sg/api/v1/nearby?lng=103.8&lat=1.3' } },
      { data: { url: 'https://binwhere.sg/api/v1/classify' } },
    ],
  };
  const scrubbed = scrubEvent(event);
  assert.equal(scrubbed.request.url, 'https://binwhere.sg/api/v1/nearby?lat=[redacted]&lng=[redacted]');
  assert.equal(scrubbed.breadcrumbs[0].data.url, 'https://binwhere.sg/api/v1/nearby?lng=[redacted]&lat=[redacted]');
  assert.equal(scrubbed.breadcrumbs[1].data.url, 'https://binwhere.sg/api/v1/classify');
  assert.equal(scrubbed.message, 'boom');
  assert.equal(JSON.stringify(scrubbed).includes('103.8'), false, 'no coordinate may survive');
});

run('scrubEvent tolerates events with neither request nor breadcrumbs', () => {
  const event: ScrubbableEvent & { message: string } = { message: 'plain' };
  assert.deepEqual(scrubEvent(event), event);
});

console.log('All scrub tests passed');
