import assert from 'node:assert/strict';
import { t, type ClassifyResult } from '@binwhere/core';
import en from '../../../packages/core/src/i18n/locales/en';
import zh from '../../../packages/core/src/i18n/locales/zh';
import ms from '../../../packages/core/src/i18n/locales/ms';
import ta from '../../../packages/core/src/i18n/locales/ta';
import { TOKENHUB_TEXT_REQUEST, TOKENHUB_VISION_REQUEST } from '../../src/lib/ai/providers/tokenhub';
import { CANDIDATE_PROFILE, profileDigest } from './baseline-profiles';
import { BCRS_BASELINE, BCRS_IMAGE_CASES, BCRS_IMAGE_SOURCES, BCRS_TEXT_CASES } from './bcrs-test-cases';
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
assert.equal(BCRS_BASELINE.id, 'sg-bcrs-v23');
assert.equal(BCRS_IMAGE_CASES.length, 73);
assert.equal(BCRS_TEXT_CASES.length, 32);
assert.equal(new Set(BCRS_IMAGE_CASES.map(({ id }) => id)).size, 73);
assert.equal(new Set(BCRS_TEXT_CASES.map(({ id }) => id)).size, 32);
// Selected and pixel-reviewed on 2026-11-06, after candidate code and labels froze.
const holdoutSources = [
  'holdout-diet-pepsi-can-on-table-v23', 'holdout-milk-tea-plastic-bottle-v23', 'holdout-pepsi-max-can-at-desk-v23',
  'holdout-cracked-phone-screen-v23', 'holdout-compact-fluorescent-bulb-v23',
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
