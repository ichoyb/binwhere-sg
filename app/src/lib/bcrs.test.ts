import assert from 'node:assert/strict';

import { buildBcrsGuideResult, formatReturnPointOpeningHours } from './bcrs';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

runTest('formatReturnPointOpeningHours handles 24-hour points', () => {
  const value = formatReturnPointOpeningHours({ alwaysOpen: true });
  assert.equal(value, '24 Hours');
});

runTest('formatReturnPointOpeningHours collapses identical daily periods', () => {
  const value = formatReturnPointOpeningHours({
    periods: Array.from({ length: 7 }, (_, day) => ({
      open: { day, time: '0700' },
      close: { day, time: '2230' },
    })),
  });

  assert.equal(value, '07:00 - 22:30');
});

runTest('formatReturnPointOpeningHours groups weekday and weekend differences', () => {
  const value = formatReturnPointOpeningHours({
    periods: [
      { open: { day: 0, time: '1000' }, close: { day: 0, time: '2200' } },
      { open: { day: 1, time: '1000' }, close: { day: 1, time: '2200' } },
      { open: { day: 2, time: '1000' }, close: { day: 2, time: '2200' } },
      { open: { day: 3, time: '1000' }, close: { day: 3, time: '2200' } },
      { open: { day: 4, time: '1000' }, close: { day: 4, time: '2300' } },
      { open: { day: 5, time: '1000' }, close: { day: 5, time: '2300' } },
      { open: { day: 6, time: '1000' }, close: { day: 6, time: '2300' } },
    ],
  });

  assert.equal(value, 'Mon-Thu 10:00 - 22:00, Fri-Sun 10:00 - 23:00');
});

runTest('buildBcrsGuideResult returns localized guide payload', () => {
  const result = buildBcrsGuideResult('en');

  assert.equal(result.channel, 'return_point');
  assert.equal(result.status, 'recyclable');
  assert.equal(result.item, 'BCRS Return Guide');
  assert.deepEqual(result.preparation, [
    'Ensure the container is empty',
    'Keep Deposit Mark and barcode intact',
    'Insert one container at a time',
    'Tap SimplyGo EZ-Link or scan DBS PayLah! QR',
  ]);
});
