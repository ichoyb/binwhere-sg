import assert from 'node:assert/strict';
import { startupCameraDecision } from './startup-camera';

const availableHome = {
  ready: true,
  hasLocation: true,
  homeVisible: true,
  userMoved: false,
  decided: false,
};

assert.equal(startupCameraDecision(availableHome), 'fly');
assert.equal(startupCameraDecision({ ...availableHome, ready: false }), 'wait');
assert.equal(startupCameraDecision({ ...availableHome, hasLocation: false }), 'wait');
assert.equal(startupCameraDecision({ ...availableHome, homeVisible: false }), 'skip');
assert.equal(startupCameraDecision({ ...availableHome, userMoved: true }), 'skip');
assert.equal(startupCameraDecision({ ...availableHome, decided: true }), 'wait');
console.log('PASS startup camera waits for map and location, then requires a visible untouched home');

for (const blocked of [{ homeVisible: false }, { userMoved: true }]) {
  assert.equal(startupCameraDecision({ ...availableHome, ...blocked, hasLocation: false }), 'wait');
  assert.equal(startupCameraDecision({ ...availableHome, ...blocked }), 'skip');
  assert.equal(startupCameraDecision({ ...availableHome, decided: true }), 'wait');
}
assert.equal(startupCameraDecision({ ...availableHome, ready: false }), 'wait');
assert.equal(startupCameraDecision(availableHome), 'fly');
assert.equal(startupCameraDecision({ ...availableHome, decided: true }), 'wait');
console.log('PASS late location or map readiness makes one decision; skipped and completed flights never retry');
