import assert from 'node:assert/strict';
import { recognitionProgress } from './recognition-progress';

let previous = 0;
for (let ms = 0; ms <= 120000; ms += 10) {
  const progress = recognitionProgress(ms);
  assert.ok(progress >= previous);
  assert.ok(progress < 1);
  previous = progress;
}
assert.equal(recognitionProgress(0), 0);
assert.ok(recognitionProgress(2000) > recognitionProgress(11000) - recognitionProgress(9000));
assert.ok(recognitionProgress(Number.MAX_VALUE) < 1);
console.log('PASS progress is monotonic, slows down and never completes before a response');
