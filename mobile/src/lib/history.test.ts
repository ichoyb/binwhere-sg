import assert from 'node:assert/strict';
import type { ClassifyResult } from '@binwhere/core';
import {
  appendHistory,
  createHistoryItem,
  decodeHistory,
  encodeHistory,
} from './history';

function run(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

const sample: ClassifyResult = {
  item: 'Plastic Bottle',
  status: 'recyclable',
  confidence: 0.92,
  channel: 'blue_bin',
  reason: 'Clean plastic bottles go in the blue bin.',
  preparation: ['Rinse', 'Remove cap'],
  tip: 'Flatten if possible',
};

run('createHistoryItem stores full result for reopen', () => {
  const item = createHistoryItem(sample, 'en', 1_700_000_000_000);
  assert.equal(item.item, 'Plastic Bottle');
  assert.equal(item.status, 'recyclable');
  assert.equal(item.channel, 'blue_bin');
  assert.equal(item.locale, 'en');
  assert.equal(item.timestamp, 1_700_000_000_000);
  assert.deepEqual(item.result, sample);
  assert.ok(item.id.includes('1700000000000'));
});

run('appendHistory prepends and caps at max', () => {
  const a = createHistoryItem(sample, 'en', 1);
  const b = createHistoryItem({ ...sample, item: 'Can' }, 'zh', 2);
  const c = createHistoryItem({ ...sample, item: 'Paper' }, 'ms', 3);
  const next = appendHistory(appendHistory([a], b, 2), c, 2);
  assert.equal(next.length, 2);
  assert.equal(next[0].item, 'Paper');
  assert.equal(next[1].item, 'Can');
});

run('encodeHistory/decodeHistory round-trip preserves result payload', () => {
  const item = createHistoryItem(sample, 'ta', 42);
  const encoded = encodeHistory([item]);
  const decoded = decodeHistory(encoded);
  assert.ok(decoded);
  assert.equal(decoded!.length, 1);
  assert.deepEqual(decoded![0].result, sample);
  assert.equal(decoded![0].locale, 'ta');
});

run('decodeHistory returns null for invalid JSON', () => {
  assert.equal(decodeHistory('not-json'), null);
  assert.equal(decodeHistory('{"x":1}'), null);
  assert.equal(decodeHistory(null), null);
});

run('decodeHistory rejects a structurally invalid history payload', () => {
  assert.equal(decodeHistory(JSON.stringify([{ id: 'broken' }])), null);
});

console.log('All history tests passed');
