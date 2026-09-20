import assert from 'node:assert/strict';
import {
  buildBcrsGuideResult,
  buildNextAction,
  type ClassifyResult,
  formatDistance,
  estimateWalkTime,
  t,
  normalizeLocale,
  CHANNEL_TO_NEARBY,
  API_V1_PATHS,
  ClassifyRequestSchema,
  NearbyResponseSchema,
  isSingaporeCoordinates,
} from '@binwhere/core';
import { getNearbyTarget } from './nearby';

function run(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

run('buildBcrsGuideResult returns return_point guide with steps', () => {
  const result = buildBcrsGuideResult('en');
  assert.equal(result.channel, 'return_point');
  assert.equal(result.status, 'recyclable');
  assert.equal(result.item, t('en', 'bcrs.guideItem'));
  assert.ok(Array.isArray(result.preparation));
  assert.equal(result.preparation!.length, 4);
  assert.equal(result.preparation![0], t('en', 'bcrs.step1'));
});

run('buildBcrsGuideResult localizes for zh', () => {
  const result = buildBcrsGuideResult('zh');
  assert.equal(result.item, t('zh', 'bcrs.guideItem'));
  assert.notEqual(result.item, t('en', 'bcrs.guideItem'));
});

run('formatDistance and walk estimate stay consistent', () => {
  assert.equal(formatDistance(0.25), '250m');
  assert.equal(formatDistance(1.5), '1.5km');
  assert.equal(estimateWalkTime(0.5), 6);
});

run('normalizeLocale maps tags to supported locales', () => {
  assert.equal(normalizeLocale('zh-CN'), 'zh');
  assert.equal(normalizeLocale('ms-MY'), 'ms');
  assert.equal(normalizeLocale('ta-SG'), 'ta');
  assert.equal(normalizeLocale('en-US'), 'en');
});

run('CHANNEL_TO_NEARBY maps recyclable channels and nulls non-nearby', () => {
  assert.equal(CHANNEL_TO_NEARBY.blue_bin, 'blue_bin');
  assert.equal(CHANNEL_TO_NEARBY.return_point, 'return_point');
  assert.equal(CHANNEL_TO_NEARBY.hazardous, null);
  assert.equal(CHANNEL_TO_NEARBY.general_waste, null);
});

run('v1 contracts reject invalid input and malformed responses', () => {
  assert.equal(ClassifyRequestSchema.safeParse({ locale: 'en' }).success, false);
  assert.equal(NearbyResponseSchema.safeParse({ results: [] }).success, false);
  assert.equal(API_V1_PATHS.classify, '/api/v1/classify');
});

run('Singapore bounds are shared by both clients and the API', () => {
  assert.equal(isSingaporeCoordinates(1.35, 103.82), true);
  assert.equal(isSingaporeCoordinates(22.3, 114.2), false);
});

run('bulky waste resolves to furniture donation points', () => {
  const target = getNearbyTarget({
    item: 'Sofa',
    status: 'special_handling',
    confidence: 0.9,
    channel: 'bulky_waste',
    reason: 'Bulky item',
  });
  assert.deepEqual(target, { channel: 'donation', acceptedItem: 'Furniture' });
});

console.log('All core smoke tests passed');

run('an unconfirmed bottle can navigate to return points without claiming a channel', () => {
  const result: ClassifyResult = {
    item: 'plastic bottle', status: 'not_sure', channel: null, confidence: 0.3, reason: 'Unknown mark',
  };
  result.next_action = buildNextAction(result, {
    beverage_product: 'prepackaged_beverage',
    visible_container_count: 'one',
    subject: 'single_prepackaged_beverage_container', whole_container_visible: true,
    form: 'bottle', material: 'plastic', volume_ml: null,
    deposit_mark: 'unverified', deposit_mark_text: '', mark_on_subject_container: false,
    linear_barcode_on_subject: false, damaged: false, contaminated: false,
  }, 'en');
  assert.deepEqual(getNearbyTarget(result), { channel: 'return_point' });
  assert.equal(result.channel, null);
});
