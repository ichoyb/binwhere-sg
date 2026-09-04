import { createHash } from 'node:crypto';

import {
  t,
  type ClassifyResult,
  type Locale,
} from '@binwhere/core';

import {
  BCRS_BASELINE,
  BCRS_IMAGE_CASES,
  BCRS_IMAGE_SOURCES,
  BCRS_POLICY_SOURCE,
  BCRS_TEXT_CASES,
  type ExpectedClassification,
} from './bcrs-test-cases';
import { TEST_ITEMS, TEXT_BASELINE } from './test-items';

export const TEXT_GATE_THRESHOLDS = {
  exactAccuracy: 0.9,
  channelAccuracy: 0.9,
  statusAccuracy: 0.9,
  perChannelAccuracy: 0.8,
  maxUnexpectedNotSureRate: 0.15,
  maxProviderErrors: 0,
  maxUnsafeDiversions: 0,
} as const;

export const TEXT_SAFETY_CHANNELS = new Set([
  'ewaste',
  'ewaste_battery',
  'lighting',
  'hazardous',
]);

export const BCRS_GATE_THRESHOLDS = {
  imageExactAccuracy: 0.95,
  imageReturnPointRecall: 0.90,
  nearDuplicateSimilarityLimit: 0.995,
} as const;

export const TEXT_TRUTH_SET_DIGEST = createHash('sha256')
  .update(JSON.stringify({ baseline: TEXT_BASELINE, items: TEST_ITEMS }))
  .digest('hex');

export const BCRS_TRUTH_SET_DIGEST = createHash('sha256').update(JSON.stringify({
  baseline: BCRS_BASELINE,
  policySource: BCRS_POLICY_SOURCE,
  nearDuplicateSimilarityLimit: BCRS_GATE_THRESHOLDS.nearDuplicateSimilarityLimit,
  textCases: BCRS_TEXT_CASES,
  imageSources: BCRS_IMAGE_SOURCES,
  imageCases: BCRS_IMAGE_CASES,
})).digest('hex');

export function resultText(result: ClassifyResult): string {
  return [result.item, result.reason, ...(result.preparation ?? []), result.tip]
    .filter((value): value is string => Boolean(value))
    .join('\n');
}

function hasRequestedLanguage(text: string, locale: Locale): boolean {
  if (locale === 'zh') return /\p{Script=Han}/u.test(text);
  if (locale === 'ta') return /\p{Script=Tamil}/u.test(text);
  if (locale === 'ms') {
    return /\b(yang|dan|tidak|untuk|dengan|ialah|ini|boleh|perlu|sila|pulangan|kosong|bersih|kelihatan)\b/i.test(text) ||
      /kitar semula|kod bar/i.test(text);
  }
  return /\b(the|this|is|has|does|with|to|in|it|bottle|can|glass|recycle)\b/i.test(text) &&
    !/\p{Script=Han}|\p{Script=Tamil}/u.test(text);
}

export function mentionsBlueBin(text: string): boolean {
  return /\bblue[ _-]?(?:recycling[ _-]?)?bin\b|蓝色回收箱|蓝箱|tong (?:kitar semula )?biru|நீல[^.!?;。！？；\n]{0,40}(?:தொட்டி|பெட்டி)/iu.test(text);
}

/** Exact assertions shared by the paid runner and the offline CI evidence gate. */
export function checkBcrsResult(
  expected: ExpectedClassification,
  result: ClassifyResult,
  locale: Locale,
): string[] {
  const failures: string[] = [];
  if (result.channel !== expected.channel) {
    failures.push(`channel expected ${expected.channel ?? 'null'}, got ${result.channel ?? 'null'}`);
  }
  if (result.status !== expected.status) {
    failures.push(`status expected ${expected.status}, got ${result.status}`);
  }
  if (expected.maxConfidence !== undefined && result.confidence > expected.maxConfidence) {
    failures.push(`confidence expected <= ${expected.maxConfidence}, got ${result.confidence}`);
  }

  const prose = resultText(result);
  for (const exact of expected.requiredExactText ?? []) {
    if (!prose.includes(exact)) failures.push(`response is missing exact text ${JSON.stringify(exact)}`);
  }
  if (prose.replaceAll('S$0.10', '').includes('$0.10')) {
    failures.push('response contains bare $0.10 instead of Singapore-dollar S$0.10');
  }
  if (!hasRequestedLanguage(prose, locale)) {
    failures.push(`response does not contain a reliable ${locale} language signal`);
  }
  if (expected.channel === null && mentionsBlueBin(prose)) {
    failures.push('not_sure response mentions a blue-bin channel before Deposit Mark absence is established');
  }
  if (expected.channel === 'return_point') {
    const expectedPreparation = [
      t(locale, 'bcrs.step1'),
      t(locale, 'bcrs.step2'),
      t(locale, 'bcrs.step3'),
      t(locale, 'bcrs.step4'),
    ];
    if (result.reason !== t(locale, 'bcrs.classifyReason')) {
      failures.push('return_point reason is not the application-owned BCRS explanation');
    }
    if (JSON.stringify(result.preparation) !== JSON.stringify(expectedPreparation)) {
      failures.push('return_point preparation is not the application-owned four-step guide');
    }
    if (result.tip !== t(locale, 'bcrs.refundAmount')) {
      failures.push('return_point tip is not the application-owned refund amount');
    }
  }
  return failures;
}
