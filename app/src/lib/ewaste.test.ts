import assert from 'node:assert/strict';
import { getEwasteAccepts, parseEwasteDescription } from './ewaste';
import { convertEwasteData } from '../../scripts/convert-ewaste-data';
import type { GeoJSONFeatureCollection } from './data-gov/shared/types';

const cases = [
  ['Bin collection; E-waste accepted: ICT equipment, Batteries and Lamps only',
    'bin', ['ict', 'battery', 'lamp'], 'ICT equipment, Batteries, Lamps'],
  ['Bin collection; E-waste accepted: Batteries and Lamps only',
    'bin', ['battery', 'lamp'], 'Batteries, Lamps'],
  ['Bin collection; E-waste accepted: Batteries only',
    'bin', ['battery'], 'Batteries'],
  ['Manned collection (Contact staff for disposal); ; ; E-waste accepted: ICT equipment and Batteries only',
    'manned', ['ict', 'battery'], 'ICT equipment, Batteries'],
  ['Bin collection; E-waste accepted: Non-regulated products only; E.g. Small household appliances, gaming consoles, audio systems, power supplies',
    'bin', ['non_regulated'], 'Small appliances'],
  ['Manned collection (Contact staff for disposal); ; ; E-waste accepted: ICT equipment, Batteries and Lamps only',
    'manned', ['ict', 'battery', 'lamp'], 'ICT equipment, Batteries, Lamps'],
  ['Manned collection (Contact staff for disposal); ; ; E-waste accepted: Batteries and Lamps only',
    'manned', ['battery', 'lamp'], 'Batteries, Lamps'],
  ['Drop-off and Bin collection; All regulated consumer products under First Schedule at https://go.gov.sg/prod-def-sl, Large Household Appliances, ICT Equipment, Portable Batteries, Lamps, Electric Mobility Devices',
    'drop_off_and_bin', ['ict', 'battery', 'lamp', 'large_appliance', 'electric_mobility'], 'All regulated e-waste'],
  ['E-waste collection drive; E-waste accepted: All regulated consumer products under First Schedule at https://go.gov.sg/prod-def-sl',
    'collection_drive', ['ict', 'battery', 'lamp', 'large_appliance', 'electric_mobility'], 'All regulated e-waste'],
] as const;

for (const [index, [description, service, items, accepts]] of cases.entries()) {
  assert.deepEqual(parseEwasteDescription(description, index + 1), { service, items, accepts });
}
assert.deepEqual(parseEwasteDescription(` \n${cases[0][0].replaceAll(' ', '  \t')}\n`, 1),
  parseEwasteDescription(cases[0][0], 1));
console.log('PASS all nine exact descriptions identify collection service, items and labels, normalizing whitespace');

const source = {
  type: 'FeatureCollection', name: 'Original source',
  features: cases.map(([DESCRIPTION], index) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [103.8, 1.3] },
    properties: { OBJECTID: index + 1, DESCRIPTION },
  })),
} satisfies GeoJSONFeatureCollection & { name: string };
const converted = convertEwasteData(source);
assert.equal(converted.sourceRecordCount, 9);
assert.equal(converted.excludedCollectionDriveCount, 1);
assert.deepEqual(converted.geojson, { ...source, features: source.features.slice(0, 8) });
converted.geojson.features.forEach((feature, index) => assert.equal(feature, source.features[index]));
assert.equal(source.features.length, 9);
console.log('PASS refresh conversion excludes only collection drives and preserves source fields, rows and order');

const unknown = 'Bin collection; E-waste accepted: restricted district';
assert.throws(() => parseEwasteDescription(unknown, 9876),
  /OBJECTID 9876: unknown DESCRIPTION "Bin collection; E-waste accepted: restricted district"/);
assert.throws(() => convertEwasteData({ ...source, features: [{
  ...source.features[0], properties: { OBJECTID: 9876, DESCRIPTION: unknown },
}] }), /OBJECTID 9876: unknown DESCRIPTION "Bin collection; E-waste accepted: restricted district"/);
console.log('PASS unknown descriptions fail parsing and refresh conversion with the exact text and OBJECTID');

const expectedKinds = [
  ['ict', 'battery', 'lamp'], ['battery', 'lamp'], ['battery'], ['ict', 'battery'],
  ['non_regulated'], ['ict', 'battery', 'lamp'], ['battery', 'lamp'], ['all_regulated'], ['all_regulated'],
];
for (const [index, [, , items]] of cases.entries()) {
  assert.deepEqual(getEwasteAccepts(items), expectedKinds[index]);
}
console.log('PASS each known collection maps its items to the accepted API kinds');

const regulated = ['ict', 'battery', 'lamp', 'large_appliance', 'electric_mobility'] as const;
for (const missing of regulated) {
  assert.throws(() => getEwasteAccepts(regulated.filter((item) => item !== missing)), /all five regulated categories/);
}
assert.throws(() => getEwasteAccepts(['large_appliance']), /all five regulated categories/);
assert.throws(() => getEwasteAccepts(['electric_mobility']), /all five regulated categories/);
console.log('PASS partial regulated collections with large appliances or electric mobility fail');
