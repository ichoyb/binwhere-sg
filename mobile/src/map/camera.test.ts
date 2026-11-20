import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getPlanningArea } from '@binwhere/core';
import { destinationCamera, cameraCommand, createMapCamera, islandCamera, neighborhoodCamera, type MapCameraTarget } from './camera';

const require = createRequire(import.meta.url);
const message = 'MapLibre version changed: first verify CameraUpdateItem.m::_makeCamera upstream. If pitch conversion is fixed, remove the zoom compensation before using the new version to avoid double compensation; revalidate bearing and native camera endpoints.';
const declared = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const locked = JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
assert.equal(declared.dependencies['@maplibre/maplibre-react-native'], '11.5.1', message);
assert.equal(locked.packages['node_modules/@maplibre/maplibre-react-native'].version, '11.5.1', message);
assert.equal(require('@maplibre/maplibre-react-native/package.json').version, '11.5.1', message);

for (const [width, height] of [[375, 812], [402, 874], [440, 956]]) {
  const view = islandCamera(width, height);
  assert.equal(view.pitch, 50);
  assert.equal(view.bearing, 0);
  assert.ok(view.zoom >= 9);
  const mercatorY = (lat: number) => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2;
  const world = 512 * 2 ** view.zoom;
  const pitch = view.pitch * Math.PI / 180;
  const project = ([lng, lat]: readonly [number, number]) => {
    const north = (mercatorY(view.center[1]) - mercatorY(lat)) * world;
    const perspective = 1 + north * Math.sin(pitch) / (height * 1.5);
    const x = width / 2 + (lng - view.center[0]) / 360 * world / perspective;
    const y = height / 2 - north * Math.cos(pitch) / perspective;
    return { x, y };
  };
  const west = project([103.60571175813675, 1.2556909533995546]);
  const east = project([104.08850938081741, 1.4008076989623583]);
  assert.ok(west.x >= 8 - 1e-7);
  assert.ok(width - east.x >= 8 - 1e-7);
  assert.ok(Math.abs(west.x - (width - east.x)) <= 0.5);
  for (const { y } of [west, east, project([view.center[0], 1.15]), project([view.center[0], 1.49])]) {
    assert.ok(y > 144 && y < height - 240, 'island stays above the home controls');
  }
  const anchor = project([view.center[0], 1.32]).y / height;
  assert.ok(anchor >= 0.5 && anchor <= 0.59 + 1e-7);
  if (width === 375) assert.ok(anchor < 0.59);
  else assert.ok(Math.abs(anchor - 0.59) < 1e-7);
}
console.log('PASS island perspective centers the Tuas and Pulau Tekong land extrema with equal 8pt margins and reserves home controls on every portrait size');

const area = getPlanningArea('AM')!;
for (const center of [[103.8454, 1.3691], [area.lng, area.lat]] as [number, number][]) {
  assert.deepEqual(neighborhoodCamera(center), { center, zoom: 16, pitch: 55, bearing: 0 });
}
console.log('PASS startup and locate share the same device or manual-area neighborhood camera target');

const target: MapCameraTarget = { center: [103.8448865, 1.368539], zoom: 17.1, pitch: 58, bearing: -24 };
for (const [pitch, correction] of [[0, 0.9161555200470944], [25, 0.7742285056996883], [45, 0.41615552004709455]]) {
  const command = cameraCommand(target, pitch);
  assert.ok(Math.abs(command.zoom - target.zoom - correction) < 1e-10);
  assert.equal(command.bearing, 336);
  assert.deepEqual(command.center, target.center);
  assert.equal(command.pitch, 58);
}
for (const [bearing, expected] of [[-384, 336], [-360, 0], [0, 0], [360, 0], [720, 0], [359.9, 359.9]]) {
  assert.ok(Math.abs(cameraCommand({ ...target, bearing }, 58).bearing - expected) < 1e-10);
}
async function main() {
  let pitch = 25;
  let reads = 0;
  const commands: unknown[] = [];
  const camera = createMapCamera({
    async getViewState() { reads++; return { ...target, pitch, bounds: [103.8, 1.3, 103.9, 1.4] as [number, number, number, number] }; },
  }, {
    flyTo: (options) => commands.push(['fly', options]),
    jumpTo: (options) => commands.push(['jump', options]),
  });
  await camera.flyTo(target, 3000);
  pitch = 45;
  await camera.jumpTo(target);
  assert.equal(reads, 2);
  assert.deepEqual(commands, [
    ['fly', { ...cameraCommand(target, 25), duration: 3000 }],
    ['jump', cameraCommand(target, 45)],
  ]);
  assert.equal((await camera.read()).pitch, 45);
  const failure = new Error('native read failed');
  const failing = createMapCamera({ getViewState: () => Promise.reject(failure) }, {
    flyTo: () => assert.fail('must read before moving'), jumpTo: () => assert.fail('must read before moving'),
  });
  await assert.rejects(failing.flyTo(target, 3000), failure);
  console.log('PASS RN 11.5.1 camera compensation, fresh reads, direct moves and version guard');
}
void main();

const destination: [number, number] = [103.845, 1.369];
for (const [width, height] of [[375, 812], [402, 874], [440, 956]]) {
  const pointOnly = destinationCamera(destination, null, width, height, 330, 62);
  assert.ok(pointOnly.zoom >= 14);
  assert.equal(pointOnly.pitch, 55);
  assert.ok(pointOnly.center[1] < destination[1], 'center shifts south so the destination sits above the card');
  const both = destinationCamera(destination, [103.846, 1.370], width, height, 330, 62);
  assert.ok(both.zoom >= 14);
  assert.ok(both.center[0] > destination[0] && both.center[0] < 103.846);
  const far = destinationCamera(destination, [103.7, 1.2], width, height, 330, 62);
  assert.deepEqual(far, pointOnly, 'keep destination framing when both cannot fit at neighborhood zoom');
}
console.log('PASS destination framing reserves card space and fits nearby user or prioritizes destination');

for (const cardHeight of [330, 464, 696]) {
  const height = 874;
  const topInset = 62;
  const target = destinationCamera(destination, null, 402, height, cardHeight, topInset);
  const mercatorY = (lat: number) => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2;
  const north = (mercatorY(target.center[1]) - mercatorY(destination[1])) * 512 * 2 ** target.zoom;
  const pitch = target.pitch * Math.PI / 180;
  const screenY = height / 2 - north * Math.cos(pitch) / (1 + north * Math.sin(pitch) / (height * 1.5));
  assert.ok(Math.abs(screenY - (height + topInset - cardHeight) / 2) < 1e-7);
  assert.ok(screenY > topInset && screenY < height - cardHeight);
}
console.log('PASS native perspective projection keeps the destination above short, tall and expanded cards');
