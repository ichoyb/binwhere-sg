import assert from 'node:assert/strict';
import { t, type ClassifyResult } from '@binwhere/core';
import en from '../../../packages/core/src/i18n/locales/en';
import zh from '../../../packages/core/src/i18n/locales/zh';
import ms from '../../../packages/core/src/i18n/locales/ms';
import ta from '../../../packages/core/src/i18n/locales/ta';
import { TOKENHUB_TEXT_REQUEST, TOKENHUB_VISION_REQUEST } from '../../src/lib/ai/providers/tokenhub';
import { CANDIDATE_PROFILE, profileDigest } from './baseline-profiles';
import { BCRS_BASELINE, BCRS_IMAGE_CASES, BCRS_IMAGE_SOURCES, BCRS_TEXT_CASES } from './bcrs-test-cases';
import { TEST_ITEMS } from './test-items';
import { evaluateReport, scoreTextResults } from './scoring';
import { checkBcrsResult, hasMinimumBcrsHoldouts, mentionsBlueBin } from './release-contract';

const yes = { channel: 'return_point' } as const;
const no = { channel: null };
const glass = { channel: 'blue_bin' } as const;
assert.equal(hasMinimumBcrsHoldouts([]), false);
assert.equal(hasMinimumBcrsHoldouts([yes, yes, yes, yes]), false);
assert.equal(hasMinimumBcrsHoldouts([no, no, no, no]), false);
assert.equal(hasMinimumBcrsHoldouts([yes, no, no, no]), false);
assert.equal(hasMinimumBcrsHoldouts([yes, yes, yes, no]), false);
assert.equal(hasMinimumBcrsHoldouts([yes, yes, no, glass]), true);
assert.equal(hasMinimumBcrsHoldouts([yes, yes, no, no, glass]), true);
assert.equal(BCRS_BASELINE.id, 'sg-bcrs-v25');
assert.equal(BCRS_IMAGE_CASES.length, 79);
assert.equal(BCRS_TEXT_CASES.length, 32);
assert.equal(new Set(BCRS_IMAGE_CASES.map(({ id }) => id)).size, 79);
assert.equal(new Set(BCRS_TEXT_CASES.map(({ id }) => id)).size, 32);
// Selected and pixel-reviewed on 2026-11-06, after candidate code and labels froze.
const holdoutSources = [
  'holdout-water-bottle-on-glass-dish-v24', 'holdout-sierra-mist-can-on-driftwood-v24', 'holdout-canada-dry-can-v24',
  'holdout-discarded-face-mask-v24', 'holdout-buckfast-glass-bottle-on-lawn-v24', 'holdout-empty-cardboard-box-v24',
];
const sources = new Set(BCRS_IMAGE_SOURCES.map(({ id }) => id));
for (const testCase of BCRS_IMAGE_CASES) {
  assert.ok(sources.has(testCase.sourceId));
  assert.equal(testCase.partition, holdoutSources.includes(testCase.sourceId) ? 'holdout' : 'regression', testCase.id);
  if (testCase.channel === null) {
    assert.ok(Object.hasOwn(testCase, 'nextAction'), testCase.id);
    assert.ok(testCase.nextAction === null || testCase.nextAction === 'check_container_type', testCase.id);
  }
  if (testCase.channel === 'return_point') {
    assert.equal(testCase.maxConfidence, undefined);
    assert.ok(testCase.requiredExactText?.includes('S$0.10'));
    assert.equal(testCase.nextAction, 'return_container');
  }
}
const holdouts = BCRS_IMAGE_CASES.filter(({ partition }) => partition === 'holdout');
assert.equal(holdouts.length, holdoutSources.length);
assert.equal(hasMinimumBcrsHoldouts(holdouts), true);
for (const id of ['official-mark-unknown', 'ordinary-water-bottle']) {
  const cases = BCRS_TEXT_CASES.filter((testCase) => testCase.id.startsWith(`${id}-`));
  assert.equal(cases.length, 4);
  assert.ok(cases.every(({ channel, maxConfidence }) => channel === 'return_point' && maxConfidence === undefined));
}
for (const id of ['crushed-aluminium-can', 'five-litre-water-bottle', 'hundred-ml-cultured-milk-bottle', 'drink-can-bought-in-johor-bahru']) {
  const cases = BCRS_TEXT_CASES.filter((testCase) => testCase.id.startsWith(`${id}-`));
  assert.deepEqual(cases.map(({ locale }) => locale).sort(), ['en', 'ms', 'ta', 'zh']);
  assert.ok(cases.every(({ channel, status }) => channel === 'blue_bin' && status === 'recyclable'));
}

// Mutating each emitted application string must invalidate the actual candidate digest.
const keys = [
  'ewaste.collection.title', 'ewaste.collection.reason', 'ewaste.collection.step1',
  'ewaste.collection.step2', 'ewaste.collection.step3', 'ewaste.collection.book',
  'action.return.title', 'action.return.instruction', 'action.return.qualification',
  'action.check.title', 'action.check.instruction', 'action.check.qualification',
  'classify.cleanGlassReason', 'classify.cleanGlassPreparation',
  'classify.excludedBeverageReason', 'classify.excludedBeveragePreparation',
  'classify.contaminatedBeverageReason', 'classify.contaminatedBeveragePreparation',
  'classify.notSureReason', 'classify.notSurePreparation',
  'bcrs.classifyReason', 'bcrs.step1', 'bcrs.step2', 'bcrs.step3', 'bcrs.step4', 'bcrs.refundAmount',
] as const;
const originalDigest = profileDigest(CANDIDATE_PROFILE);
for (const [locale, values] of Object.entries({ en, zh, ms, ta })) {
  const dictionary = values as Record<keyof typeof en, string>;
  for (const key of keys) {
    const original = dictionary[key];
    try {
      dictionary[key] = `${original} CHANGED`;
      assert.notEqual(profileDigest(CANDIDATE_PROFILE), originalDigest, `${locale}/${key} must be bound`);
    } finally {
      dictionary[key] = original;
    }
  }
}
assert.equal(profileDigest(CANDIDATE_PROFILE), originalDigest);

// Each request field a model receives must invalidate the candidate digest too.
for (const [path, request] of Object.entries({ text: TOKENHUB_TEXT_REQUEST, image: TOKENHUB_VISION_REQUEST })) {
  const fields = request as unknown as Record<string, unknown>;
  for (const key of Object.keys(fields)) {
    const original = fields[key];
    try {
      fields[key] = typeof original === 'number' ? original + 1 : `${JSON.stringify(original)} CHANGED`;
      assert.notEqual(profileDigest(CANDIDATE_PROFILE), originalDigest, `${path}.${key} must be bound`);
    } finally {
      fields[key] = original;
    }
  }
}
assert.equal(profileDigest(CANDIDATE_PROFILE), originalDigest);

const revisedKeys = [
  'action.return.title', 'action.return.instruction', 'action.return.qualification',
  'action.check.title', 'action.check.instruction', 'action.check.qualification', 'bcrs.classifyReason',
  'classify.excludedBeverageReason', 'classify.excludedBeveragePreparation',
  'classify.contaminatedBeverageReason', 'classify.contaminatedBeveragePreparation',
] as const;
for (const locale of ['ms', 'ta'] as const) {
  for (const key of revisedKeys) {
    const english = t('en', key);
    const translated = t(locale, key);
    for (const literal of ['Deposit Mark', 'Deposit Mark (10¢ SG RETURN)', 'S$0.10']) {
      assert.equal(translated.split(literal).length, english.split(literal).length, `${locale}/${key}/${literal}`);
    }
    if (english.includes('Return Point')) {
      assert.ok(translated.includes(t(locale, 'channel.return_point').replace('BCRS', '').trim()), `${locale}/${key}/Return Point`);
    }
  }
}
for (const locale of ['en', 'zh', 'ms', 'ta'] as const) {
  for (const key of ['action.check.title', 'action.check.instruction', 'action.check.qualification',
    'classify.notSureReason', 'classify.notSurePreparation'] as const) {
    assert.equal(mentionsBlueBin(t(locale, key)), false, `${locale}/${key} cannot direct uncertain disposal`);
  }
}

// Use the real release assertions to check all locales, currency and exact application copy.
for (const locale of ['en', 'zh', 'ms', 'ta'] as const) {
  const returned: ClassifyResult = {
    item: 'container', channel: 'return_point', status: 'recyclable', confidence: 0.8,
    reason: t(locale, 'bcrs.classifyReason'),
    preparation: [t(locale, 'bcrs.step1'), t(locale, 'bcrs.step2'), t(locale, 'bcrs.step3'), t(locale, 'bcrs.step4')],
    tip: t(locale, 'bcrs.refundAmount'),
    next_action: {
      type: 'return_container', channel: 'return_point', title: t(locale, 'action.return.title'),
      instruction: t(locale, 'action.return.instruction'), qualification: t(locale, 'action.return.qualification'),
    },
  };
  const expected = { channel: 'return_point', status: 'recyclable', requiredExactText: ['S$0.10'] } as const;
  assert.deepEqual(checkBcrsResult(expected, returned, locale, true), []);
  assert.ok(checkBcrsResult(expected, { ...returned, reason: 'MODEL REASON' }, locale, true).length > 0);
  const uncertain: ClassifyResult = {
    item: 'container', channel: null, status: 'not_sure', confidence: 0.49,
    reason: t(locale, 'classify.notSureReason'), preparation: [t(locale, 'classify.notSurePreparation')],
    next_action: {
      type: 'check_container_type', channel: 'return_point', title: t(locale, 'action.check.title'),
      instruction: t(locale, 'action.check.instruction'), qualification: t(locale, 'action.check.qualification'),
    },
  };
  const unknown = { channel: null, status: 'not_sure', nextAction: 'check_container_type', maxConfidence: 0.49 } as const;
  assert.deepEqual(checkBcrsResult(unknown, uncertain, locale, true), []);
  assert.ok(checkBcrsResult(unknown, { ...uncertain, tip: 'blue recycling bin' }, locale, true).length > 0);
  assert.ok(checkBcrsResult(unknown, { ...uncertain, confidence: 0.5 }, locale, true).length > 0);
  assert.ok(checkBcrsResult(unknown, { ...uncertain, next_action: { ...uncertain.next_action!, type: 'try_return_point' } }, locale, true).length > 0);
}
console.log('PASS v23 truth invariants, minimum holdouts, 80 copy bindings and four-language release assertions');

const exactTextResults = TEST_ITEMS.map((item) => ({
  item, result: { item: item.text, channel: item.expectedChannel, status: item.expectedStatus,
    confidence: 0.9, reason: 'Test', item_kind: item.expectedItemKind } as ClassifyResult,
  channelMatch: true, statusMatch: true, durationMs: 1,
}));
const exactReport = scoreTextResults(exactTextResults);
assert.equal(exactReport.exactAccuracy, 1);
assert.equal(exactReport.itemKindAccuracy, 1);
assert.equal(evaluateReport(exactReport).releaseEligible, true);
const wrongKindResults = structuredClone(exactTextResults);
wrongKindResults.find((entry) => entry.item.expectedItemKind === 'large_household_appliance')!.result.item_kind = 'ict_equipment';
const wrongKindReport = scoreTextResults(wrongKindResults);
assert.equal(wrongKindReport.exactAccuracy, (TEST_ITEMS.length - 1) / TEST_ITEMS.length);
assert.equal(wrongKindReport.unsafeItemKindDiversions, 1);
assert.equal(evaluateReport(wrongKindReport).itemKindPass, true);
assert.equal(evaluateReport(wrongKindReport).itemKindSafetyPass, false);
for (const entry of wrongKindResults) delete entry.result.item_kind;
const missingKindReport = scoreTextResults(wrongKindResults);
assert.equal(missingKindReport.itemKindAccuracy, 0);
assert.equal(evaluateReport(missingKindReport).itemKindPass, false);
const productionReport = scoreTextResults(wrongKindResults, false);
assert.equal(productionReport.exactAccuracy, 1);
assert.equal(evaluateReport(productionReport, false).releaseEligible, true);
const phone = BCRS_IMAGE_CASES.find((entry) => entry.sourceId === 'nonbeverage-shattered-phone')!;
const phoneAnswer: ClassifyResult = { item: 'broken phone', channel: 'ewaste', status: 'special_handling', confidence: 0.9,
  reason: 'This phone is broken and goes to an e-waste collection point.' };
assert.ok(checkBcrsResult(phone, phoneAnswer, 'en', true).some((failure) => failure.includes('item_kind')));
assert.deepEqual(checkBcrsResult(phone, { ...phoneAnswer, item_kind: 'ict_equipment' }, 'en', true), []);
console.log('PASS item-kind exactness, accuracy and zero-unsafe-kind gates; production retains channel/status scoring');
