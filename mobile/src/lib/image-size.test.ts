import assert from 'node:assert/strict';
import { classifyImageSize } from './image-size';

for (const [width, height, expected] of [
  [4000, 3000, { width: 2048, height: 1536 }],
  [3000, 4000, { width: 1536, height: 2048 }],
  [3000, 3000, { width: 2048, height: 2048 }],
  [640, 480, { width: 640, height: 480 }],
  [1206, 2622, { width: 942, height: 2048 }],
  [12000, 3000, { width: 2048, height: 512 }],
] as const) assert.deepEqual(classifyImageSize(width, height), expected);
console.log('PASS landscape, portrait, square, small, iPhone screenshot and panorama dimensions');
