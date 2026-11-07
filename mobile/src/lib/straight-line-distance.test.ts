import assert from 'node:assert/strict';
import { formatDistance } from '@binwhere/core';
import { straightLineKm } from './straight-line-distance';

const origin = { lat: 1.3691, lng: 103.8454 };
const point = [103.846873725006, 1.36973114618757];
assert.equal(formatDistance(straightLineKm(origin, point)), '178m');
assert.equal(straightLineKm(origin, [origin.lng, origin.lat]), 0);
console.log('PASS the Ang Mo Kio point card uses straight-line distance in metres');
