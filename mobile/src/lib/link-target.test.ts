import assert from 'node:assert/strict';
import { linkTarget } from './link-target';

for (const url of ['https://binwhere.sg/data-license', 'http://localhost:26000', 'HTTPS://data.gov.sg/open-data-licence']) {
  assert.equal(linkTarget(url), 'browser', url);
}
for (const url of ['mailto:ichoyb@gmail.com', 'tel:+6562255632']) {
  assert.equal(linkTarget(url), 'system', url);
}
for (const url of ['ftp://example.com', 'binwhere://home', 'javascript:alert(1)']) {
  assert.throws(() => linkTarget(url), /Unsupported link scheme/, url);
}
console.log('PASS http(s) opens in-app, mailto/tel use the system, and other schemes are rejected');
