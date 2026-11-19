import type { ClassifyResult, Locale } from '@binwhere/core';
import { TEST_ITEMS, getItemsByChannel, type TestItem } from './test-items';
import type { ExpectedClassification } from './bcrs-test-cases';
import { BCRS_GATE_THRESHOLDS, TEXT_GATE_THRESHOLDS, TEXT_SAFETY_CHANNELS,
  hasMinimumBcrsHoldouts, mentionsBlueBin, resultText } from './release-contract';

export interface TestResult {
  item: TestItem;
  result: ClassifyResult | null;
  error?: string;
  channelMatch: boolean;
  statusMatch: boolean;
  durationMs: number;
}

export interface ProviderReport {
  provider: string;
  totalItems: number;
  channelAccuracy: number;
  statusAccuracy: number;
  exactAccuracy: number;
  itemKindAccuracy: number;
  unsafeItemKindDiversions: number;
  notSureCount: number;
  notSureRate: number;
  perChannel: Record<string, { total: number; correct: number; accuracy: number }>;
  avgConfidence: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  errors: number;
  unsafeDiversions: number;
  results: TestResult[];
}

export interface RegressionResult {
  id: string;
  mode: 'text' | 'image';
  locale: Locale;
  partition: 'regression' | 'holdout';
  expected: ExpectedClassification;
  actual: ClassifyResult | null;
  assertions: string[];
  durationMs: number;
  sourcePageUrl?: string;
  error?: string;
}

export function evaluateReport(report: ProviderReport, checkKinds = true) {
  const exactPass = report.exactAccuracy >= TEXT_GATE_THRESHOLDS.exactAccuracy;
  const channelPass = report.channelAccuracy >= TEXT_GATE_THRESHOLDS.channelAccuracy;
  const statusPass = report.statusAccuracy >= TEXT_GATE_THRESHOLDS.statusAccuracy;
  const notSurePass = report.notSureRate < TEXT_GATE_THRESHOLDS.maxUnexpectedNotSureRate;
  const perChannelPass = Object.values(report.perChannel).every(
    (stats) => stats.accuracy >= TEXT_GATE_THRESHOLDS.perChannelAccuracy,
  );
  const errorsPass = report.errors <= TEXT_GATE_THRESHOLDS.maxProviderErrors;
  const safetyPass = report.unsafeDiversions <= TEXT_GATE_THRESHOLDS.maxUnsafeDiversions;
  const itemKindPass = !checkKinds || report.itemKindAccuracy >= TEXT_GATE_THRESHOLDS.itemKindAccuracy;
  const itemKindSafetyPass = !checkKinds || report.unsafeItemKindDiversions <= TEXT_GATE_THRESHOLDS.maxUnsafeItemKindDiversions;
  return {
    itemKindPass,
    itemKindSafetyPass,
    exactPass,
    channelPass,
    statusPass,
    perChannelPass,
    notSurePass,
    errorsPass,
    safetyPass,
    measurementValid: errorsPass,
    releaseEligible: exactPass && channelPass && statusPass && perChannelPass &&
      notSurePass && errorsPass && safetyPass && itemKindPass && itemKindSafetyPass,
  };
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * ratio) - 1];
}

export function scoreTextResults(results: TestResult[], checkKinds = true): ProviderReport {
  const channelCorrect = results.filter((entry) => entry.channelMatch).length;
  const statusCorrect = results.filter((entry) => entry.statusMatch).length;
  const kindMatches = (entry: TestResult) => entry.item.expectedItemKind === undefined
    || entry.result?.item_kind === entry.item.expectedItemKind;
  const exactCorrect = results.filter((entry) => entry.channelMatch && entry.statusMatch
    && (!checkKinds || kindMatches(entry))).length;
  const kindResults = results.filter((entry) => entry.item.expectedItemKind !== undefined);
  const itemKindAccuracy = kindResults.filter(kindMatches).length / kindResults.length;
  const unsafeItemKindDiversions = results.filter((entry) => (
    (entry.item.expectedItemKind === 'large_household_appliance' || entry.item.expectedItemKind === 'electric_mobility_device')
    && (entry.result?.item_kind === 'ict_equipment' || entry.result?.item_kind === 'other_electrical')
  )).length;
  const notSureCount = results.filter((entry) => entry.result?.status === 'not_sure').length;
  const errorCount = results.filter((entry) => entry.error !== undefined).length;
  const unsafeDiversions = results.filter((entry) => entry.result &&
    TEXT_SAFETY_CHANNELS.has(entry.item.expectedChannel) && entry.result.channel !== null &&
    entry.result.channel !== entry.item.expectedChannel).length;
  const totalConfidence = results.reduce((total, entry) => total + (entry.result?.confidence ?? 0), 0);
  const totalDuration = results.reduce((total, entry) => total + (entry.result ? entry.durationMs : 0), 0);
  // Per-channel stats
  const perChannel: Record<string, { total: number; correct: number; accuracy: number }> = {};
  const byChannel = getItemsByChannel();
  for (const [channel, items] of Array.from(byChannel)) {
    const channelResults = results.filter((r) => r.item.expectedChannel === channel);
    const correct = channelResults.filter((r) => r.channelMatch).length;
    perChannel[channel] = {
      total: items.length,
      correct,
      accuracy: items.length > 0 ? correct / items.length : 0,
    };
  }

  const report: ProviderReport = {
    provider: 'tokenhub',
    totalItems: TEST_ITEMS.length,
    channelAccuracy: channelCorrect / TEST_ITEMS.length,
    statusAccuracy: statusCorrect / TEST_ITEMS.length,
    exactAccuracy: exactCorrect / TEST_ITEMS.length,
    itemKindAccuracy,
    unsafeItemKindDiversions,
    notSureCount,
    notSureRate: notSureCount / TEST_ITEMS.length,
    perChannel,
    avgConfidence: totalConfidence / (TEST_ITEMS.length - errorCount || 1),
    avgDurationMs: totalDuration / (TEST_ITEMS.length - errorCount || 1),
    p50DurationMs: percentile(results.filter((result) => result.result).map((result) => result.durationMs), 0.5),
    p95DurationMs: percentile(results.filter((result) => result.result).map((result) => result.durationMs), 0.95),
    errors: errorCount,
    unsafeDiversions,
    results,
  };

  return report;
}

export function serializeTextReport(report: ProviderReport) {
  return {
    ...report,
    results: report.results.map((entry) => ({
      text: entry.item.text,
      locale: entry.item.locale ?? 'en',
      expected: { channel: entry.item.expectedChannel, status: entry.item.expectedStatus, item_kind: entry.item.expectedItemKind },
      actual: entry.result ? { channel: entry.result.channel, status: entry.result.status,
        confidence: entry.result.confidence, item_kind: entry.result.item_kind } : null,
      channelMatch: entry.channelMatch, statusMatch: entry.statusMatch,
      durationMs: entry.durationMs, error: entry.error,
    })),
  };
}

export function scoreBcrsResults(
  results: RegressionResult[], completeSuite: boolean, expectedHoldoutTotal: number, checkActions = true,
) {
  const passed = results.filter((result) => !result.error && result.assertions.length === 0).length;
  const textResults = results.filter((result) => result.mode === 'text');
  const imageResults = results.filter((result) => result.mode === 'image');
  const textPassed = textResults.filter(
    (result) => !result.error && result.assertions.length === 0,
  ).length;
  const imagePassed = imageResults.filter(
    (result) => !result.error && result.assertions.length === 0,
  ).length;
  const imageReturnPointResults = imageResults.filter(
    (result) => result.expected.channel === 'return_point',
  );
  const imageReturnPointsFound = imageReturnPointResults.filter(
    (result) => !result.error && result.actual?.channel === 'return_point' &&
      result.actual.status === 'recyclable',
  ).length;
  const imageExactAccuracy = imageResults.length === 0 ? 1 : imagePassed / imageResults.length;
  const imageReturnPointRecall = imageReturnPointResults.length === 0
    ? 1
    : imageReturnPointsFound / imageReturnPointResults.length;
  const holdout = results.filter((result) => result.partition === 'holdout');
  const holdoutPassed = holdout.filter((result) => !result.error && result.assertions.length === 0).length;
  const wrongChannelDirections = results.filter(
    (result) => result.actual && result.actual.channel !== null &&
      result.actual.channel !== result.expected.channel,
  ).length;
  const falseReturnPoints = results.filter(
    (result) => result.expected.channel !== 'return_point' && result.actual?.channel === 'return_point',
  ).length;
  const notSureBlueBinMentions = results.filter(
    (result) => result.expected.channel === null && result.actual &&
      mentionsBlueBin(resultText(result.actual)),
  ).length;
  const providerErrors = results.filter((result) => Boolean(result.error)).length;
  const measurementValid = providerErrors === 0;
  const holdoutSafetyPassed = holdout.filter((result) => {
    if (result.error || !result.actual) return false;
    const wrongDirection = result.actual.channel !== null &&
      result.actual.channel !== result.expected.channel;
    const blueBinLeak = result.expected.channel === null &&
      mentionsBlueBin(resultText(result.actual));
    return !wrongDirection && !blueBinLeak &&
      (!checkActions || result.assertions.length === 0);
  }).length;
  const assertionsPass = measurementValid && passed === results.length &&
    falseReturnPoints === 0 && notSureBlueBinMentions === 0;
  const releaseEligible = completeSuite &&
    holdout.length === expectedHoldoutTotal &&
    measurementValid &&
    textPassed === textResults.length &&
    imageExactAccuracy >= BCRS_GATE_THRESHOLDS.imageExactAccuracy &&
    imageReturnPointRecall >= BCRS_GATE_THRESHOLDS.imageReturnPointRecall &&
    wrongChannelDirections === 0 &&
    falseReturnPoints === 0 &&
    notSureBlueBinMentions === 0 &&
    holdoutSafetyPassed === holdout.length &&
    hasMinimumBcrsHoldouts(holdout.map(({ expected }) => expected));
  const gate = {
    measurementValid,
    releaseEligible,
    completeSuite,
    passed,
    total: results.length,
    textPassed,
    textTotal: textResults.length,
    imagePassed,
    imageTotal: imageResults.length,
    imageExactAccuracy,
    imageReturnPointsFound,
    imageReturnPointTotal: imageReturnPointResults.length,
    imageReturnPointRecall,
    holdoutPassed,
    holdoutTotal: holdout.length,
    holdoutSafetyPassed,
    wrongChannelDirections,
    falseReturnPoints,
    notSureBlueBinMentions,
    providerErrors,
    thresholds: {
      imageExactAccuracy: BCRS_GATE_THRESHOLDS.imageExactAccuracy,
      imageReturnPointRecall: BCRS_GATE_THRESHOLDS.imageReturnPointRecall,
    },
  };
  return { gate, assertionsPass };
}
