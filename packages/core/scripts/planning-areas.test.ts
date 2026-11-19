import assert from 'node:assert/strict';
import { PLANNING_AREAS, getPlanningArea, isSingaporeCoordinates, VALID_LOCALES } from '../src';

assert.equal(PLANNING_AREAS.length, 32);
assert.equal(new Set(PLANNING_AREAS.map((area) => area.code)).size, 32);
assert.deepEqual(PLANNING_AREAS.map((area) => area.names.en),
  PLANNING_AREAS.map((area) => area.names.en).sort());
for (const area of PLANNING_AREAS) {
  assert.equal(getPlanningArea(area.code), area);
  for (const locale of VALID_LOCALES) assert.ok(area.names[locale].trim(), `${area.code}: ${locale}`);
  assert.ok(isSingaporeCoordinates(area.lat, area.lng), area.code);
}
assert.equal(getPlanningArea('unknown'), undefined);
console.log('PASS 32 unique, sorted Singapore planning areas with names in all four languages');
