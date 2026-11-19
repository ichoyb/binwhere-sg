import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import {
  ItemKindSchema, DONATION_CATEGORIES, EWASTE_ITEM_KINDS, CHANNEL_STATUS,
  ClassifyResultSchema, NearbyQuerySchema, ScanHistorySchema, applyItemKindPolicy,
  getResultDestinationQuery, getResultTitleKey, getItemCategories, t, VALID_LOCALES,
  type ClassifyResult, type ChannelType, type ItemKind,
} from '../src';

const snapshot = JSON.parse(gunzipSync(readFileSync(join(__dirname, '../../../app/data/geo-snapshot/reuse-channels.json.gz'))).toString()) as {
  features: Array<{ properties: { ACCEPTEDITEMS: string } }>;
};
const categories = new Set(snapshot.features.flatMap(({ properties }) => properties.ACCEPTEDITEMS.split(',').map((name) => name.trim())));
assert.deepEqual(new Set(Object.values(DONATION_CATEGORIES)), categories);
assert.equal(ItemKindSchema.options.length, 15);
console.log('PASS donation categories exactly match every snapshot category');

function result(channel: ChannelType | null, kind?: ItemKind): ClassifyResult {
  return { item: '物品', channel, status: channel ? CHANNEL_STATUS[channel] : 'not_sure',
    confidence: 0.9, reason: 'Model reason', preparation: ['Model step'], tip: 'Model tip', item_kind: kind };
}

for (const channel of [...Object.keys(CHANNEL_STATUS), null] as Array<ChannelType | null>) {
  for (const kind of ItemKindSchema.options) {
    const retain = channel === 'ewaste' ? Object.hasOwn(EWASTE_ITEM_KINDS, kind)
      : channel === 'donation' && Object.hasOwn(DONATION_CATEGORIES, kind);
    const actual = applyItemKindPolicy(result(channel), kind, 'en');
    assert.equal(actual.item_kind, retain ? kind : undefined, `${channel}/${kind}`);
    assert.equal(ClassifyResultSchema.safeParse(result(channel, kind)).success, Boolean(retain), `${channel}/${kind}`);
    assert.equal(NearbyQuerySchema.safeParse({ lat: 1.3, lng: 103.8, channel, itemKind: kind }).success, Boolean(retain));
    assert.equal(NearbyQuerySchema.safeParse({ lat: 1.3, lng: 103.8, channel, itemKind: kind, acceptedItem: 'Books' }).success, false);
  }
}
assert.ok(ClassifyResultSchema.safeParse(result('ewaste')).success);
assert.ok(ScanHistorySchema.safeParse([{ id: 'old', item: 'Old item', status: 'special_handling', channel: 'ewaste', timestamp: 1, result: result('ewaste') }]).success);
console.log('PASS kind retention, public result consistency, nearby combinations and historical results');

for (const locale of VALID_LOCALES) {
  for (const kind of ['large_household_appliance', 'electric_mobility_device'] as const) {
    const actual = applyItemKindPolicy(result('ewaste'), kind, locale);
    assert.equal(actual.reason, t(locale, 'ewaste.collection.reason'));
    assert.deepEqual(actual.preparation, [t(locale, 'ewaste.collection.step1'), t(locale, 'ewaste.collection.step2'), t(locale, 'ewaste.collection.step3')]);
    assert.equal(actual.tip, undefined);
    assert.equal(getResultTitleKey(actual), 'ewaste.collection.title');
    assert.equal(getResultDestinationQuery(actual), null);
  }
  const electronics = getItemCategories(locale).find((category) => category.id === 'electronics')!;
  const tvIndex = electronics.items.findIndex((item) => item.result.item_kind === 'large_household_appliance');
  assert.equal(electronics.items[tvIndex].result.reason, t(locale, 'ewaste.collection.reason'));
  assert.equal(electronics.items[tvIndex + 1].result.reason, t(locale, 'ewaste.monitor.reason'));
  const cables = electronics.items.find((item) => item.result.item_kind === 'other_electrical')!;
  assert.equal(cables.result.tip, undefined);
}

for (const channel of Object.keys(CHANNEL_STATUS) as ChannelType[]) {
  const expected = channel === 'bulky_waste' ? { channel: 'donation', itemKind: 'furniture' }
    : ['hazardous', 'general_waste'].includes(channel) ? null : { channel };
  assert.deepEqual(getResultDestinationQuery(result(channel)), expected);
  assert.equal(getResultTitleKey(result(channel)), `instruction.${channel}`);
}
for (const kind of ['ict_equipment', 'other_electrical'] as const) {
  assert.deepEqual(getResultDestinationQuery(result('ewaste', kind)), { channel: 'ewaste', itemKind: kind });
}
for (const kind of Object.keys(DONATION_CATEGORIES) as Array<keyof typeof DONATION_CATEGORIES>) {
  assert.deepEqual(getResultDestinationQuery(result('donation', kind)), { channel: 'donation', itemKind: kind });
}
assert.equal(getResultDestinationQuery(result(null)), null);
assert.equal(getResultTitleKey(result(null)), null);
console.log('PASS shared destination table, collection copy, titles and translated browse items');
