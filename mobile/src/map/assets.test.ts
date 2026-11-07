import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mapAssets } from './assets';

for (const url of [mapAssets.initialStyle, mapAssets.basemap.url, mapAssets.trees.url, mapAssets.mask.data]) {
  const path = url.replace(/^pmtiles:\/\//, '').replace('asset://map-assets/', '');
  assert.ok(existsSync(fileURLToPath(new URL(`../../assets/map-assets/${path}`, import.meta.url))));
}
assert.equal(mapAssets.minZoom, 9);
assert.equal(mapAssets.maxZoom, 15);
assert.equal(mapAssets.glyphs, 'asset://map-assets/fonts/{fontstack}/{range}.pbf');
assert.equal(mapAssets.sprite, 'asset://map-assets/sprite');
assert.equal(mapAssets.fontStack, 'Noto Sans Regular');
console.log('PASS packaged map asset addresses');
