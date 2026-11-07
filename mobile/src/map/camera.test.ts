import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { destinationCamera, cameraCommand, createMapCamera, islandCamera, type MapCameraTarget } from './camera';

const require = createRequire(import.meta.url);
const message = 'MapLibre version changed: first verify CameraUpdateItem.m::_makeCamera upstream. If pitch conversion is fixed, remove the zoom compensation before using the new version to avoid double compensation; revalidate bearing and native camera endpoints.';
const declared = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const locked = JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
assert.equal(declared.dependencies['@maplibre/maplibre-react-native'], '11.5.1', message);
assert.equal(locked.packages['node_modules/@maplibre/maplibre-react-native'].version, '11.5.1', message);
assert.equal(require('@maplibre/maplibre-react-native/package.json').version, '11.5.1', message);

for (const [width, height] of [[375, 812], [402, 874], [440, 956]]) {
  const view = islandCamera(width, height);
  assert.equal(view.pitch, 25);
  assert.equal(view.bearing, 0);
  const longitudeSpan = width * 360 / (512 * 2 ** view.zoom);
  assert.ok(view.center[0] - longitudeSpan / 2 < 103.59);
  assert.ok(view.center[0] + longitudeSpan / 2 > 104.1);
}
console.log('PASS initial island camera frames the packaged map longitude range on portrait screens');

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
