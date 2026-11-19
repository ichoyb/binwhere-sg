import assert from 'node:assert/strict';
import type { NearbyChannel, ItemKind } from '@binwhere/core';
import { SpatialIndex } from './data-gov/geo/spatial-index';
import type { GeoJSONFeature } from './data-gov/shared/types';
import { queryNearby } from './nearby';

const descriptions = {
  battery: 'Bin collection; E-waste accepted: Batteries only',
  lamps: 'Bin collection; E-waste accepted: Batteries and Lamps only',
  nonRegulated: 'Bin collection; E-waste accepted: Non-regulated products only; E.g. Small household appliances, gaming consoles, audio systems, power supplies',
  ict: 'Bin collection; E-waste accepted: ICT equipment, Batteries and Lamps only',
  all: 'Drop-off and Bin collection; All regulated consumer products under First Schedule at https://go.gov.sg/prod-def-sl, Large Household Appliances, ICT Equipment, Portable Batteries, Lamps, Electric Mobility Devices',
};

function point(id: number, description: string, acceptedItems = ''): GeoJSONFeature {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [103.8 + id * 0.0001, 1.3] },
    properties: { OBJECTID: id, DESCRIPTION: description, ACCEPTEDITEMS: acceptedItems } };
}

function query(features: GeoJSONFeature[], channel: NearbyChannel, limit: number, acceptedItem?: string, itemKind?: ItemKind) {
  const index = new SpatialIndex();
  index.buildFromFeatures(features);
  return queryNearby(index, { lat: 1.3, lng: 103.8, radius: 1, channel, limit, acceptedItem, itemKind })
    .map(({ properties }) => properties.OBJECTID);
}

const ewaste = [
  point(1, descriptions.battery), point(2, descriptions.nonRegulated), point(3, descriptions.lamps),
  point(4, descriptions.ict), point(5, descriptions.all),
];
assert.deepEqual(query(ewaste, 'ewaste', 2), [4, 5]);
assert.deepEqual(query(ewaste, 'ewaste_battery', 5), [1, 3, 4, 5]);
assert.deepEqual(query(ewaste, 'lighting', 5), [3, 4, 5]);
console.log('PASS e-waste channels select their accepted items, include all-regulated points and exclude non-regulated points');

for (const channel of ['ewaste', 'ewaste_battery', 'lighting'] as const) {
  const nearer = Array.from({ length: 9 }, (_, i) => point(i + 1,
    channel === 'ewaste' ? descriptions.battery
      : channel === 'lighting' ? descriptions.battery : descriptions.nonRegulated));
  assert.deepEqual(query([...nearer, point(10, descriptions.all), point(11, descriptions.ict),
    point(12, descriptions.all)], channel, 2), [10, 11]);
}
console.log('PASS each e-waste channel returns the nearest limit after more than limit × 4 nearer non-matches');

const donations = [
  ...Array.from({ length: 9 }, (_, i) => point(i + 1, '', 'Clothing')),
  point(10, '', 'Furniture, Books'), point(11, '', 'Furniture'), point(12, '', 'Furniture'),
];
assert.deepEqual(query(donations, 'donation', 2, 'fUrNiTuRe'), [10, 11]);
assert.deepEqual(query(donations, 'donation', 2), [1, 2]);
console.log('PASS donation item filtering precedes limit, while unfiltered donation retains distance order and limit');

for (const [kind, ids] of [
  ['ict_equipment', [4, 5]], ['other_electrical', [2]],
  ['large_household_appliance', [5]], ['electric_mobility_device', [5]],
] as const) {
  assert.deepEqual(query(ewaste, 'ewaste', 5, undefined, kind), ids);
}
assert.deepEqual(query([point(1, '', 'Not Books'), point(2, '', 'Bookshelf'), point(3, '', 'Books, Stationery'),
  point(4, '', ' books '), point(5, '', 'Books')], 'donation', 2, undefined, 'books'), [3, 5]);
console.log('PASS every e-waste kind and exact case-sensitive donation category filtering before limit');
