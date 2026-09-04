/**
 * Offline production-release gate for the paid classification evaluations.
 *
 * CI must not call a paid, non-deterministic model on every push. Instead, an
 * explicitly recorded result carries every per-case answer. This checker derives
 * the gates again and binds that evidence to the current prompt/model contract,
 * truth sets, production baselines, and output-affecting image pipeline.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  ChannelTypeSchema,
  ClassifyResultSchema,
  ClassifyStatusSchema,
  IMAGE_MAX_SIZE,
  IMAGE_QUALITY,
  type ClassifyResult,
} from '@binwhere/core';

import { IMAGE_SANITIZATION_CONTRACT } from '../../src/lib/image-security';
import {
  CANDIDATE_PROFILE,
  PRODUCTION_PROFILE,
  profileDigest,
  type ClassificationProfile,
} from './baseline-profiles';
import {
  BCRS_BASELINE,
  BCRS_IMAGE_CASES,
  BCRS_IMAGE_SOURCES,
  BCRS_POLICY_SOURCE,
  BCRS_TEXT_CASES,
} from './bcrs-test-cases';
import {
  BCRS_GATE_THRESHOLDS,
  BCRS_TRUTH_SET_DIGEST,
  TEXT_GATE_THRESHOLDS,
  TEXT_SAFETY_CHANNELS,
  TEXT_TRUTH_SET_DIGEST,
  checkBcrsResult,
  mentionsBlueBin,
  resultText,
} from './release-contract';
import { TEST_ITEMS, TEXT_BASELINE } from './test-items';

const EVIDENCE_PATH = path.join(__dirname, 'release-evidence', 'current.json');
const MAX_BASELINE_PAIR_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredProfile {
  id: string;
  revision: string;
  digest: string;
}

interface StoredTextCase {
  text: string;
  expected: { channel: string; status: string };
  actual: { channel: string | null; status: string; confidence: number } | null;
  channelMatch: boolean;
  statusMatch: boolean;
  error?: string;
}

interface StoredTextReport {
  provider: string;
  totalItems: number;
  exactAccuracy: number;
  channelAccuracy: number;
  statusAccuracy: number;
  notSureCount: number;
  notSureRate: number;
  perChannel: Record<string, { total: number; correct: number; accuracy: number }>;
  errors: number;
  unsafeDiversions: number;
  results: StoredTextCase[];
}

interface StoredTextEvidence {
  timestamp: string;
  baseline: unknown;
  truthSetDigest: string;
  profile: StoredProfile;
  models: { text: string };
  thresholds: unknown;
  testSetSize: number;
  gates: unknown[];
  comparison?: unknown;
  reports: StoredTextReport[];
}

interface StoredBcrsCase {
  id: string;
  mode: 'text' | 'image';
  locale: 'en' | 'zh' | 'ms' | 'ta';
  partition: 'regression' | 'holdout';
  expected: unknown;
  actual: unknown;
  assertions: string[];
  error?: string;
}

interface StoredBcrsEvidence {
  timestamp: string;
  runKind: string;
  baseline: unknown;
  truthSetDigest: string;
  profile: StoredProfile;
  models: { text: string; image: string };
  policySource: unknown;
  imagePipeline: unknown;
  imageIndependence: {
    nearDuplicateSimilarityLimit: number;
    closestPair: null | {
      leftSourceId: string;
      rightSourceId: string;
      similarity: number;
    };
  };
  sources: unknown;
  gate: unknown;
  results: StoredBcrsCase[];
}

interface ReleaseEvidence {
  schemaVersion: 1;
  recordedAt: string;
  classificationImagePipeline: {
    contract: unknown;
    digest: string;
  };
  text: StoredTextEvidence;
  bcrs: StoredBcrsEvidence;
}

interface TextDerived {
  exactAccuracy: number;
  channelAccuracy: number;
  statusAccuracy: number;
  notSureCount: number;
  notSureRate: number;
  errors: number;
  unsafeDiversions: number;
  perChannel: Record<string, { total: number; correct: number; accuracy: number }>;
  exactByText: Map<string, boolean>;
  gate: {
    exactPass: boolean;
    channelPass: boolean;
    statusPass: boolean;
    perChannelPass: boolean;
    notSurePass: boolean;
    errorsPass: boolean;
    safetyPass: boolean;
    measurementValid: boolean;
    releaseEligible: boolean;
  };
}

function jsonValue(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function parseTimestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  assert.ok(Number.isFinite(parsed), `${label} has an invalid timestamp`);
  return parsed;
}

function assertPairedTimestamps(
  productionTimestamp: string,
  candidateTimestamp: string,
  label: string,
) {
  const delta = parseTimestamp(candidateTimestamp, `${label} candidate`) -
    parseTimestamp(productionTimestamp, `${label} production baseline`);
  assert.ok(delta >= 0, `${label} candidate predates its production baseline`);
  assert.ok(
    delta <= MAX_BASELINE_PAIR_AGE_MS,
    `${label} candidate and production baseline are more than 24 hours apart`,
  );
}

function assertProfile(actual: StoredProfile, expected: ClassificationProfile, label: string) {
  assert.deepEqual(actual, {
    id: expected.id,
    revision: expected.revision,
    digest: profileDigest(expected),
  }, `${label} profile does not match the current executable contract`);
}

function deriveText(report: StoredTextReport, label: string): TextDerived {
  assert.equal(report.provider, 'tokenhub', `${label} must contain the TokenHub report`);
  assert.equal(report.totalItems, TEST_ITEMS.length, `${label} total item count differs`);
  assert.equal(report.results.length, TEST_ITEMS.length, `${label} is not a complete text run`);

  const byText = new Map(report.results.map((result) => [result.text, result]));
  assert.equal(byText.size, TEST_ITEMS.length, `${label} contains duplicate or missing cases`);

  let channelCorrect = 0;
  let statusCorrect = 0;
  let exactCorrect = 0;
  let notSureCount = 0;
  let errors = 0;
  let unsafeDiversions = 0;
  const exactByText = new Map<string, boolean>();
  const perChannel: TextDerived['perChannel'] = {};

  for (const item of TEST_ITEMS) {
    const stored = byText.get(item.text);
    assert.ok(stored, `${label} is missing ${JSON.stringify(item.text)}`);
    assert.deepEqual(stored.expected, {
      channel: item.expectedChannel,
      status: item.expectedStatus,
    }, `${label} changed the expected answer for ${JSON.stringify(item.text)}`);

    if (stored.error !== undefined || stored.actual === null) {
      errors += 1;
      exactByText.set(item.text, false);
      continue;
    }

    const actualChannel = ChannelTypeSchema.nullable().parse(stored.actual.channel);
    const actualStatus = ClassifyStatusSchema.parse(stored.actual.status);
    assert.ok(
      Number.isFinite(stored.actual.confidence) &&
        stored.actual.confidence >= 0 && stored.actual.confidence <= 1,
      `${label} has invalid confidence for ${JSON.stringify(item.text)}`,
    );

    const channelMatch = actualChannel === item.expectedChannel;
    const statusMatch = actualStatus === item.expectedStatus;
    assert.equal(stored.channelMatch, channelMatch, `${label} channelMatch is not derived`);
    assert.equal(stored.statusMatch, statusMatch, `${label} statusMatch is not derived`);

    if (channelMatch) channelCorrect += 1;
    if (statusMatch) statusCorrect += 1;
    if (channelMatch && statusMatch) exactCorrect += 1;
    if (actualStatus === 'not_sure') notSureCount += 1;
    if (
      TEXT_SAFETY_CHANNELS.has(item.expectedChannel) &&
      actualChannel !== null &&
      actualChannel !== item.expectedChannel
    ) {
      unsafeDiversions += 1;
    }
    exactByText.set(item.text, channelMatch && statusMatch);
  }

  for (const item of TEST_ITEMS) {
    const channel = item.expectedChannel;
    if (!perChannel[channel]) perChannel[channel] = { total: 0, correct: 0, accuracy: 0 };
    perChannel[channel].total += 1;
    if (byText.get(item.text)?.channelMatch) perChannel[channel].correct += 1;
  }
  for (const stats of Object.values(perChannel)) {
    stats.accuracy = stats.correct / stats.total;
  }

  const total = TEST_ITEMS.length;
  const exactAccuracy = exactCorrect / total;
  const channelAccuracy = channelCorrect / total;
  const statusAccuracy = statusCorrect / total;
  const notSureRate = notSureCount / total;
  const exactPass = exactAccuracy >= TEXT_GATE_THRESHOLDS.exactAccuracy;
  const channelPass = channelAccuracy >= TEXT_GATE_THRESHOLDS.channelAccuracy;
  const statusPass = statusAccuracy >= TEXT_GATE_THRESHOLDS.statusAccuracy;
  const perChannelPass = Object.values(perChannel).every(
    (stats) => stats.accuracy >= TEXT_GATE_THRESHOLDS.perChannelAccuracy,
  );
  const notSurePass = notSureRate < TEXT_GATE_THRESHOLDS.maxUnexpectedNotSureRate;
  const errorsPass = errors <= TEXT_GATE_THRESHOLDS.maxProviderErrors;
  const safetyPass = unsafeDiversions <= TEXT_GATE_THRESHOLDS.maxUnsafeDiversions;

  return {
    exactAccuracy,
    channelAccuracy,
    statusAccuracy,
    notSureCount,
    notSureRate,
    errors,
    unsafeDiversions,
    perChannel,
    exactByText,
    gate: {
      exactPass,
      channelPass,
      statusPass,
      perChannelPass,
      notSurePass,
      errorsPass,
      safetyPass,
      measurementValid: errorsPass,
      releaseEligible: exactPass && channelPass && statusPass && perChannelPass &&
        notSurePass && errorsPass && safetyPass,
    },
  };
}

function assertStoredTextMetrics(report: StoredTextReport, derived: TextDerived, label: string) {
  assert.equal(report.exactAccuracy, derived.exactAccuracy, `${label} exact accuracy is not derived`);
  assert.equal(report.channelAccuracy, derived.channelAccuracy, `${label} channel accuracy is not derived`);
  assert.equal(report.statusAccuracy, derived.statusAccuracy, `${label} status accuracy is not derived`);
  assert.equal(report.notSureCount, derived.notSureCount, `${label} not-sure count is not derived`);
  assert.equal(report.notSureRate, derived.notSureRate, `${label} not-sure rate is not derived`);
  assert.equal(report.errors, derived.errors, `${label} error count is not derived`);
  assert.equal(report.unsafeDiversions, derived.unsafeDiversions, `${label} unsafe count is not derived`);
  assert.deepEqual(report.perChannel, derived.perChannel, `${label} channel metrics are not derived`);
}

function loadTextProductionBaseline(): StoredTextEvidence {
  const baselinePath = path.join(
    __dirname,
    'baselines',
    TEXT_BASELINE.id,
    `${PRODUCTION_PROFILE.id}.json`,
  );
  return JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as StoredTextEvidence;
}

function verifyTextEvidence(candidate: StoredTextEvidence) {
  assert.deepEqual(candidate.baseline, jsonValue(TEXT_BASELINE));
  assert.equal(candidate.truthSetDigest, TEXT_TRUTH_SET_DIGEST);
  assertProfile(candidate.profile, CANDIDATE_PROFILE, 'Text candidate');
  assert.equal(candidate.models.text, CANDIDATE_PROFILE.providerOptions.textModel);
  assert.equal(candidate.testSetSize, TEST_ITEMS.length);
  assert.deepEqual(candidate.thresholds, TEXT_GATE_THRESHOLDS);
  assert.equal(candidate.reports.length, 1, 'Text evidence must contain one report');

  const candidateDerived = deriveText(candidate.reports[0], 'Text candidate');
  assertStoredTextMetrics(candidate.reports[0], candidateDerived, 'Text candidate');
  assert.deepEqual(candidate.gates, [candidateDerived.gate]);
  assert.ok(candidateDerived.gate.releaseEligible, 'Text candidate does not pass absolute gates');

  const production = loadTextProductionBaseline();
  assert.deepEqual(production.baseline, jsonValue(TEXT_BASELINE));
  assert.equal(production.truthSetDigest, TEXT_TRUTH_SET_DIGEST);
  assertProfile(production.profile, PRODUCTION_PROFILE, 'Text production baseline');
  assert.equal(production.reports.length, 1, 'Text production baseline must contain one report');
  const productionDerived = deriveText(production.reports[0], 'Text production baseline');
  assertStoredTextMetrics(production.reports[0], productionDerived, 'Text production baseline');
  assert.equal(productionDerived.errors, 0, 'Text production baseline has provider errors');
  assertPairedTimestamps(production.timestamp, candidate.timestamp, 'Text');

  const regressedExactCases = TEST_ITEMS
    .filter((item) => (
      productionDerived.exactByText.get(item.text) &&
      !candidateDerived.exactByText.get(item.text)
    ))
    .map((item) => item.text);
  const regressedChannels = Object.entries(productionDerived.perChannel)
    .filter(([channel, stats]) => candidateDerived.perChannel[channel].correct < stats.correct)
    .map(([channel]) => channel);
  const comparison = {
    productionProfile: PRODUCTION_PROFILE.id,
    exactAccuracyDelta: candidateDerived.exactAccuracy - productionDerived.exactAccuracy,
    channelAccuracyDelta: candidateDerived.channelAccuracy - productionDerived.channelAccuracy,
    statusAccuracyDelta: candidateDerived.statusAccuracy - productionDerived.statusAccuracy,
    notSureCountDelta: candidateDerived.notSureCount - productionDerived.notSureCount,
    regressedExactCases,
    regressedChannels,
    pass: candidateDerived.exactAccuracy >= productionDerived.exactAccuracy &&
      candidateDerived.channelAccuracy >= productionDerived.channelAccuracy &&
      candidateDerived.statusAccuracy >= productionDerived.statusAccuracy &&
      candidateDerived.notSureCount <= productionDerived.notSureCount &&
      regressedExactCases.length === 0 &&
      regressedChannels.length === 0,
  };
  assert.deepEqual(candidate.comparison, comparison, 'Text production comparison is not derived');
  assert.ok(comparison.pass, 'Text candidate regresses from the paired production baseline');
}

function loadBcrsProductionBaseline(): StoredBcrsEvidence {
  const baselinePath = path.join(
    __dirname,
    'baselines',
    BCRS_BASELINE.id,
    `${PRODUCTION_PROFILE.id}.json`,
  );
  return JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as StoredBcrsEvidence;
}

function verifyBcrsEvidence(candidate: StoredBcrsEvidence) {
  assert.equal(candidate.runKind, 'complete');
  assert.deepEqual(candidate.baseline, jsonValue(BCRS_BASELINE));
  assert.equal(candidate.truthSetDigest, BCRS_TRUTH_SET_DIGEST);
  assertProfile(candidate.profile, CANDIDATE_PROFILE, 'BCRS candidate');
  assert.deepEqual(candidate.models, {
    text: CANDIDATE_PROFILE.providerOptions.textModel,
    image: CANDIDATE_PROFILE.providerOptions.visionModel,
  });
  assert.deepEqual(candidate.policySource, jsonValue(BCRS_POLICY_SOURCE));
  assert.deepEqual(candidate.sources, jsonValue(BCRS_IMAGE_SOURCES));

  const expectedCases = [
    ...BCRS_TEXT_CASES.map((testCase) => ({
      mode: 'text' as const,
      partition: 'regression' as const,
      testCase,
    })),
    ...BCRS_IMAGE_CASES.map((testCase) => ({
      mode: 'image' as const,
      partition: testCase.partition,
      testCase,
    })),
  ];
  assert.equal(candidate.results.length, expectedCases.length, 'BCRS evidence is not complete');
  const byId = new Map(candidate.results.map((result) => [result.id, result]));
  assert.equal(byId.size, expectedCases.length, 'BCRS evidence has duplicate or missing cases');

  const checked: Array<{
    stored: StoredBcrsCase;
    actual: ClassifyResult | null;
    assertions: string[];
  }> = [];
  for (const expected of expectedCases) {
    const stored = byId.get(expected.testCase.id);
    assert.ok(stored, `BCRS evidence is missing ${expected.testCase.id}`);
    assert.equal(stored.mode, expected.mode);
    assert.equal(stored.locale, expected.testCase.locale);
    assert.equal(stored.partition, expected.partition);
    assert.deepEqual(stored.expected, jsonValue(expected.testCase));

    const actual = stored.actual === null
      ? null
      : ClassifyResultSchema.parse(stored.actual);
    const assertions = actual
      ? checkBcrsResult(expected.testCase, actual, expected.testCase.locale)
      : ['classification completed without error'];
    assert.deepEqual(stored.assertions, assertions, `${stored.id} assertions are not derived`);
    checked.push({ stored, actual, assertions });
  }

  const passed = checked.filter(
    ({ stored, assertions }) => stored.error === undefined && assertions.length === 0,
  ).length;
  const textResults = checked.filter(({ stored }) => stored.mode === 'text');
  const imageResults = checked.filter(({ stored }) => stored.mode === 'image');
  const textPassed = textResults.filter(
    ({ stored, assertions }) => stored.error === undefined && assertions.length === 0,
  ).length;
  const imagePassed = imageResults.filter(
    ({ stored, assertions }) => stored.error === undefined && assertions.length === 0,
  ).length;
  const imageReturnPoints = imageResults.filter(
    ({ stored }) => (stored.expected as { channel?: unknown }).channel === 'return_point',
  );
  const imageReturnPointsFound = imageReturnPoints.filter(
    ({ stored, actual }) => stored.error === undefined && actual?.channel === 'return_point' &&
      actual.status === 'recyclable',
  ).length;
  const holdout = checked.filter(({ stored }) => stored.partition === 'holdout');
  const holdoutPassed = holdout.filter(
    ({ stored, assertions }) => stored.error === undefined && assertions.length === 0,
  ).length;
  const wrongChannelDirections = checked.filter(({ stored, actual }) => {
    const expectedChannel = (stored.expected as { channel?: unknown }).channel;
    return actual && actual.channel !== null && actual.channel !== expectedChannel;
  }).length;
  const falseReturnPoints = checked.filter(({ stored, actual }) => (
    (stored.expected as { channel?: unknown }).channel !== 'return_point' &&
    actual?.channel === 'return_point'
  )).length;
  const notSureBlueBinMentions = checked.filter(({ stored, actual }) => (
    (stored.expected as { channel?: unknown }).channel === null &&
    actual && mentionsBlueBin(resultText(actual))
  )).length;
  const providerErrors = checked.filter(({ stored }) => stored.error !== undefined).length;
  const holdoutSafetyPassed = holdout.filter(({ stored, actual }) => {
    if (stored.error !== undefined || !actual) return false;
    const expectedChannel = (stored.expected as { channel?: unknown }).channel;
    const wrongDirection = actual.channel !== null && actual.channel !== expectedChannel;
    const blueBinLeak = expectedChannel === null && mentionsBlueBin(resultText(actual));
    return !wrongDirection && !blueBinLeak;
  }).length;
  const imageExactAccuracy = imageResults.length === 0 ? 1 : imagePassed / imageResults.length;
  const imageReturnPointRecall = imageReturnPoints.length === 0
    ? 1
    : imageReturnPointsFound / imageReturnPoints.length;
  const measurementValid = providerErrors === 0;
  const releaseEligible = measurementValid &&
    textPassed === textResults.length &&
    imageExactAccuracy >= BCRS_GATE_THRESHOLDS.imageExactAccuracy &&
    imageReturnPointRecall >= BCRS_GATE_THRESHOLDS.imageReturnPointRecall &&
    wrongChannelDirections === 0 &&
    falseReturnPoints === 0 &&
    notSureBlueBinMentions === 0 &&
    holdoutSafetyPassed === holdout.length;
  const gate = {
    measurementValid,
    releaseEligible,
    completeSuite: true,
    passed,
    total: checked.length,
    textPassed,
    textTotal: textResults.length,
    imagePassed,
    imageTotal: imageResults.length,
    imageExactAccuracy,
    imageReturnPointsFound,
    imageReturnPointTotal: imageReturnPoints.length,
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
  assert.deepEqual(candidate.gate, gate, 'BCRS release metrics are not derived');
  assert.ok(releaseEligible, 'BCRS candidate does not pass the release gate');

  assert.equal(
    candidate.imageIndependence.nearDuplicateSimilarityLimit,
    BCRS_GATE_THRESHOLDS.nearDuplicateSimilarityLimit,
  );
  const closest = candidate.imageIndependence.closestPair;
  assert.ok(closest, 'Complete BCRS evidence has no image-independence result');
  const sourceIds = new Set(BCRS_IMAGE_SOURCES.map((source) => source.id));
  assert.ok(sourceIds.has(closest.leftSourceId));
  assert.ok(sourceIds.has(closest.rightSourceId));
  assert.notEqual(closest.leftSourceId, closest.rightSourceId);
  assert.ok(closest.similarity < BCRS_GATE_THRESHOLDS.nearDuplicateSimilarityLimit);

  const production = loadBcrsProductionBaseline();
  assert.equal(production.runKind, 'complete');
  assert.deepEqual(production.baseline, jsonValue(BCRS_BASELINE));
  assert.equal(production.truthSetDigest, BCRS_TRUTH_SET_DIGEST);
  assertProfile(production.profile, PRODUCTION_PROFILE, 'BCRS production baseline');
  const productionGate = production.gate as {
    measurementValid?: unknown;
    completeSuite?: unknown;
    total?: unknown;
    holdoutTotal?: unknown;
    providerErrors?: unknown;
  };
  assert.equal(productionGate.measurementValid, true);
  assert.equal(productionGate.completeSuite, true);
  assert.equal(productionGate.total, expectedCases.length);
  assert.equal(
    productionGate.holdoutTotal,
    BCRS_IMAGE_CASES.filter((testCase) => testCase.partition === 'holdout').length,
  );
  assert.equal(productionGate.providerErrors, 0);
  const productionIds = new Set(production.results.map((result) => result.id));
  assert.equal(productionIds.size, expectedCases.length);
  for (const expected of expectedCases) assert.ok(productionIds.has(expected.testCase.id));
  assertPairedTimestamps(production.timestamp, candidate.timestamp, 'BCRS');
}

function sharpPackageVersion(): string {
  const packageLock = readJson<{
    packages?: Record<string, { version?: string }>;
  }>(path.join(__dirname, '..', '..', 'package-lock.json'));
  const version = packageLock.packages?.['node_modules/sharp']?.version;
  assert.ok(version, 'app/package-lock.json has no locked sharp version');
  return version;
}

function classificationImagePipelineContract() {
  return {
    webClient: {
      autoOrient: true,
      outputFormat: 'jpeg',
      maxDimension: IMAGE_MAX_SIZE,
      preserveAspectRatio: true,
      withoutEnlargement: true,
      flattenBackground: '#ffffff',
      quality: IMAGE_QUALITY,
    },
    server: IMAGE_SANITIZATION_CONTRACT,
    evaluationImplementation: {
      sharpPackageVersion: sharpPackageVersion(),
    },
  } as const;
}

function classificationImagePipelineDigest(): string {
  return createHash('sha256')
    .update(JSON.stringify(classificationImagePipelineContract()))
    .digest('hex');
}

function verifyEvidence(evidence: ReleaseEvidence) {
  assert.equal(evidence.schemaVersion, 1);
  parseTimestamp(evidence.recordedAt, 'Release evidence');
  assert.deepEqual(
    evidence.classificationImagePipeline.contract,
    classificationImagePipelineContract(),
  );
  assert.equal(
    evidence.classificationImagePipeline.digest,
    classificationImagePipelineDigest(),
  );
  verifyTextEvidence(evidence.text);
  verifyBcrsEvidence(evidence.bcrs);
}

function argValue(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function main() {
  const record = process.argv.includes('--record');
  const check = process.argv.includes('--check');
  assert.ok(!(record && check), 'Choose either --record or --check');

  if (record) {
    const textResultPath = argValue('text-result');
    const bcrsResultPath = argValue('bcrs-result');
    assert.ok(textResultPath, '--record requires --text-result=<path>');
    assert.ok(bcrsResultPath, '--record requires --bcrs-result=<path>');
    const evidence: ReleaseEvidence = {
      schemaVersion: 1,
      recordedAt: new Date().toISOString(),
      classificationImagePipeline: {
        contract: classificationImagePipelineContract(),
        digest: classificationImagePipelineDigest(),
      },
      text: readJson<StoredTextEvidence>(path.resolve(textResultPath)),
      bcrs: readJson<StoredBcrsEvidence>(path.resolve(bcrsResultPath)),
    };
    verifyEvidence(evidence);
    fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
    fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(`PASS recorded classification release evidence: ${EVIDENCE_PATH}`);
    return;
  }

  const evidence = readJson<ReleaseEvidence>(EVIDENCE_PATH);
  verifyEvidence(evidence);
  console.log(
    `PASS classification release evidence (${TEST_ITEMS.length} text + ` +
      `${BCRS_TEXT_CASES.length + BCRS_IMAGE_CASES.length} BCRS cases)`,
  );
}

main();
