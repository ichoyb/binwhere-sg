/**
 * Live/smoke exercise of the shipped classify client against production when network allows.
 * Falls back to documented skip only if fetch fails for network reasons.
 */
import assert from 'node:assert/strict';
import { classifyItem, buildClassifyBody, buildClassifyUrl } from './client';

async function main() {
  // Assert pure builders used by the client first
  const body = buildClassifyBody({ text: 'plastic bottle', locale: 'en' });
  assert.equal(body.text, 'plastic bottle');
  assert.ok(buildClassifyUrl().includes('/api/v1/classify'));

  try {
    const result = await classifyItem({ text: 'plastic bottle', locale: 'en' });
    assert.ok(result.item && result.item.length > 0, 'item must be non-empty');
    assert.ok(
      [
        'recyclable',
        'special_handling',
        'consider_donating',
        'not_recyclable',
        'not_sure',
      ].includes(result.status),
      `unexpected status ${result.status}`,
    );
    console.log('PASS live classifyItem', JSON.stringify({ item: result.item, status: result.status, channel: result.channel }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Network blocked / offline — not a product logic failure
    if (
      msg.includes('fetch failed') ||
      msg.includes('ENOTFOUND') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('network') ||
      msg.includes('Network')
    ) {
      console.log('SKIP live classify (network):', msg);
      return;
    }
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
