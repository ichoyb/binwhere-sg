import assert from 'node:assert/strict';

import { normalizeMachineStatus } from './convert-rvm-data';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

runTest('normalizeMachineStatus treats pre-launch machines as online', () => {
  assert.equal(normalizeMachineStatus('PRE_LAUNCH'), 'ONLINE');
});

runTest('normalizeMachineStatus keeps online machines online', () => {
  assert.equal(normalizeMachineStatus('ONLINE'), 'ONLINE');
});

runTest('normalizeMachineStatus falls back to empty string', () => {
  assert.equal(normalizeMachineStatus(undefined), '');
});
