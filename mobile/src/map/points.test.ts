import assert from 'node:assert/strict';
import type { PointsResponse } from '@binwhere/core';
import { pointTypes, pointsToGeoJSON } from './points';
import { pointColors, pointLayers } from './style';

const response: PointsResponse = {
  dataVersion: 'a'.repeat(64),
  layers: {
    blue_bin: [[1.3, 103.8, 'Bin', 'A'], [1.3, 103.8, 'Bin', 'A']],
    return_point: [[1.31, 103.81, 'BCRS', 'B']],
    ewaste: [[1.32, 103.82, 'E-waste', 'C']],
    textile: [[1.33, 103.83, 'Textile', 'D']],
    donation: [[1.34, 103.84, 'Donation', 'E']],
  },
};
const original = structuredClone(response);
const points = pointsToGeoJSON(response);
assert.equal(points.features.length, 6);
for (const type of pointTypes) {
  const features = points.features.filter((feature) => feature.properties.type === type);
  assert.equal(features.length, response.layers[type].length);
  features.forEach((feature, index) => {
    const [latitude, longitude, name, address] = response.layers[type][index];
    assert.equal(feature.id, `${type}:${index}`);
    assert.deepEqual(feature.geometry, { type: 'Point', coordinates: [longitude, latitude] });
    assert.deepEqual(feature.properties, { type, name, address, dataVersion: response.dataVersion });
  });
}
assert.notEqual(points.features[0].id, points.features[1].id);
assert.deepEqual(response, original);
assert.deepEqual(pointsToGeoJSON({
  ...response, layers: { blue_bin: [], return_point: [], ewaste: [], textile: [], donation: [] },
}), { type: 'FeatureCollection', features: [] });
console.log('PASS v2 map points preserve rows, coordinates, types and snapshot-scoped ids');

for (const type of pointTypes) {
  const core = pointLayers([type]).find((layer) => layer.id === 'point-core')!;
  assert.deepEqual(core.filter, ['in', ['get', 'type'], ['literal', [type]]]);
  assert.ok((core.paint!['circle-color'] as unknown[]).includes(pointColors[type]));
}
console.log('PASS layer controls share the point palette and type filters');
