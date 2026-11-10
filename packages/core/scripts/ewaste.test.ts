import assert from 'node:assert/strict';
import {
  EwasteAcceptSchema,
  PointsResponseSchema,
  ewasteAcceptTranslationKey,
  type EwasteAccept,
  type PointsResponse,
  type TranslationKey,
} from '../src';

const keys: [EwasteAccept, TranslationKey][] = [
  ['ict', 'accept.ict'],
  ['battery', 'accept.batteries'],
  ['lamp', 'accept.lamps'],
  ['non_regulated', 'accept.appliances'],
  ['all_regulated', 'accept.allEwaste'],
];
assert.deepEqual(EwasteAcceptSchema.options, keys.map(([kind]) => kind));
for (const [kind, key] of keys) assert.equal(ewasteAcceptTranslationKey(kind), key);
console.log('PASS all five e-waste kinds map to the existing translation keys');

const response: PointsResponse = {
  dataVersion: 'a'.repeat(64),
  layers: {
    blue_bin: [], return_point: [], ewaste: [[1.3, 103.8, 'E-waste', 'Address']], textile: [], donation: [],
  },
};
assert.equal(PointsResponseSchema.safeParse(response).success, true);
for (const kinds of [['ict', 'battery', 'lamp', 'non_regulated'], ['all_regulated'], ['battery']]) {
  assert.equal(PointsResponseSchema.safeParse({ ...response, ewasteAccepts: [kinds] }).success, true);
}
assert.equal(PointsResponseSchema.safeParse({
  ...response, layers: { ...response.layers, ewaste: [] }, ewasteAccepts: [],
}).success, true);
console.log('PASS e-waste kinds are optional and accept ordered nonempty entries, including all_regulated alone');

for (const [name, ewasteAccepts] of [
  ['too few entries', []],
  ['too many entries', [['battery'], ['lamp']]],
  ['empty kinds', [[]]],
  ['duplicate kinds', [['battery', 'battery']]],
  ['unordered kinds', [['lamp', 'battery']]],
  ['mixed all_regulated', [['ict', 'all_regulated']]],
  ['unknown kind', [['large_appliance']]],
] as const) {
  assert.equal(PointsResponseSchema.safeParse({ ...response, ewasteAccepts }).success, false, name);
}
console.log('PASS malformed e-waste kinds fail length, nonempty, uniqueness, ordering, exclusivity and enum validation');
