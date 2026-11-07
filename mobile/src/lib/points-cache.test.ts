import assert from 'node:assert/strict';
import type { PointsResponse } from '@binwhere/core';
import { readPointsCache, writePointsCache, pointsCacheKey, type PointsStorage } from './points-cache';

async function main() {
  const entries = new Map<string, string>();
  const storage: PointsStorage = {
    async getItem(key) { return entries.get(key) ?? null; },
    async setItem(key, value) { entries.set(key, value); },
    async removeItem(key) { entries.delete(key); },
  };
  const apiUrl = 'http://localhost:26000/api/v2/points';
  const response: PointsResponse = {
    dataVersion: 'a'.repeat(64),
    layers: { blue_bin: [[1.3, 103.8, 'Bin', 'Block 1']], return_point: [], ewaste: [], textile: [], donation: [] },
  };
  assert.equal(await readPointsCache(storage, apiUrl), null);
  const cached = { apiUrl, etag: '"snapshot-a"', response };
  await writePointsCache(storage, cached);
  assert.deepEqual(await readPointsCache(storage, apiUrl), cached);
  assert.equal(await readPointsCache(storage, 'https://other.example/api/v2/points'), null);
  assert.deepEqual(await readPointsCache(storage, apiUrl), cached);
  for (const invalid of ['{broken', JSON.stringify({ ...cached, apiUrl: 42 }),
    JSON.stringify({ ...cached, response: { ...response, dataVersion: 'broken' } })]) {
    entries.set(pointsCacheKey, invalid);
    assert.equal(await readPointsCache(storage, apiUrl), null);
    assert.equal(entries.has(pointsCacheKey), false);
  }
  console.log('PASS points cache preserves response and ETag, isolates API addresses, deletes corrupt data');
}
void main();
