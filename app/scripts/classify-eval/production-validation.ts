import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ChannelTypeSchema, ClassifyResultSchema, ClassifyStatusSchema } from '@binwhere/core';

import { DEFAULT_EXECUTION_POLICY } from '../../src/lib/ai/provider';
import { PRODUCTION_PROFILE, PRODUCTION_REVISION } from './baseline-profiles';
import { BCRS_IMAGE_CASES, BCRS_TEXT_CASES } from './bcrs-test-cases';
import { BCRS_TRUTH_SET_DIGEST, TEXT_TRUTH_SET_DIGEST, BCRS_GATE_THRESHOLDS } from './release-contract';
import { TEST_ITEMS } from './test-items';
import { CURRENT_MANIFEST_DIGEST, currentManifestCases } from './production-manifest';
import {
  PRODUCTION_DEPENDENCIES, PRODUCTION_LOCKFILES, PRODUCTION_MODELS, PRODUCTION_MODULE_PATHS, PRODUCTION_NODE_VERSION,
} from './production-contract';
import type { ProductionRawOutput, ProductionSource } from './production-types';

const MAX_PAIR_AGE_MS = 24 * 60 * 60 * 1000;

/** CI uses committed constants and portable truth only: no git objects, worktree or cache. */
export function validateProductionSource(source: ProductionSource, allowDryRun = false): void {
  assert.ok(source, 'Production source record is missing');
  assert.equal(source.preflight.revision, PRODUCTION_REVISION, 'Production revision mismatch');
  assert.deepEqual(source.preflight.trackedChanges, [], 'Production tracked changes mismatch');
  assert.deepEqual(source.preflight.lockfiles, PRODUCTION_LOCKFILES, 'Production lockfile SHA-256 mismatch');
  assert.deepEqual(source.preflight.checks,
    { head: true, trackedChanges: true, lockfiles: true }, 'Runtime preflight did not pass');
  assert.equal(source.manifestDigest, CURRENT_MANIFEST_DIGEST, 'Production manifest digest mismatch');
  assert.deepEqual(source.dependencies, PRODUCTION_DEPENDENCIES, 'Production dependency versions mismatch');
  assert.deepEqual(source.models, PRODUCTION_MODELS, 'Production classifier models mismatch');
  assert.deepEqual(source.modulePaths, PRODUCTION_MODULE_PATHS, 'Production module paths mismatch');
  assert.equal(source.nodeVersion, PRODUCTION_NODE_VERSION, 'Production Node version mismatch');
  assert.equal(source.policyFieldsMatch, true, 'Production execution policy fields mismatch');
  assert.deepEqual(source.executionPolicy, DEFAULT_EXECUTION_POLICY, 'Production execution policy differs from current candidate');
  assert.equal(typeof source.dryRun, 'boolean', 'Production dry-run flag is missing');
  if (!allowDryRun) assert.equal(source.dryRun, false, 'Dry-run cannot supply a production baseline');
  const start = Date.parse(source.startedAt);
  const end = Date.parse(source.endedAt);
  assert.ok(Number.isFinite(start) && Number.isFinite(end) && end >= start, 'Invalid production start/end time');
  assert.deepEqual(source.imagePipeline, { maxSize: 2048, quality: 0.7 }, 'Production image pipeline mismatch');
  const expectedSources = [...new Set(currentManifestCases().flatMap((entry) => entry.image ? [entry.image.sourceId] : []))].sort();
  assert.deepEqual(source.preparedImages.map((entry) => entry.sourceId).sort(), expectedSources,
    'Production image preprocessing is incomplete');
  for (const image of source.preparedImages) assert.match(image.sha256, /^[a-f0-9]{64}$/);
  assert.equal(source.imageIndependence.nearDuplicateSimilarityLimit,
    BCRS_GATE_THRESHOLDS.nearDuplicateSimilarityLimit, 'Production image similarity limit mismatch');
  const pair = source.imageIndependence.closestPair;
  assert.ok(pair && expectedSources.includes(pair.leftSourceId) && expectedSources.includes(pair.rightSourceId)
    && pair.leftSourceId !== pair.rightSourceId && Number.isFinite(pair.similarity)
    && pair.similarity >= 0 && pair.similarity < BCRS_GATE_THRESHOLDS.nearDuplicateSimilarityLimit,
  'Production images failed independence check');
}

export function productionProfileDigest(source: ProductionSource): string {
  return createHash('sha256').update(JSON.stringify({
    revision: source.preflight.revision, lockfiles: source.preflight.lockfiles,
    dependencies: source.dependencies, models: source.models, modules: source.modulePaths,
    manifest: source.manifestDigest, policy: source.executionPolicy,
  })).digest('hex');
}

function assertCaseIds(actual: readonly string[], expected: readonly string[], label: string) {
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${label} cases are incomplete or duplicated`);
}

export function validateProductionRaw(raw: ProductionRawOutput, allowDryRun = false): void {
  assert.equal(raw.schemaVersion, 1, 'Unsupported production raw output');
  assert.equal(raw.fatalError, undefined, 'Production subprocess failed');
  validateProductionSource(raw.source, allowDryRun);
  assertCaseIds(raw.results.map((entry) => entry.id), currentManifestCases().map((entry) => entry.id), 'Raw production');
  for (const entry of raw.results) {
    assert.equal(entry.error, undefined, `Production case has an error: ${entry.id}`);
    assert.ok(Number.isFinite(entry.durationMs) && entry.durationMs >= 0, `Invalid duration: ${entry.id}`);
    if (raw.source.dryRun) assert.equal(entry.result, null, 'Dry-run contains a model result');
    else ClassifyResultSchema.parse(entry.result);
  }
}

interface BaselineView {
  timestamp: string;
  truthSetDigest: string;
  profile: { id: string; revision: string; digest: string };
  source: ProductionSource;
  testSetSize: number;
  reports: Array<{ totalItems: number; errors: number; results: Array<{
    text: string; error?: string; actual: unknown;
  }> }>;
  gates: Array<{ measurementValid: boolean }>;
  runKind: string;
  gate: { measurementValid: boolean; completeSuite: boolean; total: number; providerErrors: number; holdoutTotal: number };
  results: Array<{ id: string; error?: string; actual: unknown }>;
}

/** Shared by both candidate preflights and the offline release evidence checker. */
export function validateProductionBaseline(value: unknown, suite: 'text' | 'bcrs', candidateTimestamp: string): void {
  assert.ok(value && typeof value === 'object', 'Production baseline is missing');
  const baseline = value as BaselineView;
  validateProductionSource(baseline.source);
  assert.deepEqual(baseline.profile, { ...PRODUCTION_PROFILE, digest: productionProfileDigest(baseline.source) },
    'Production profile identity mismatch');
  assert.equal(baseline.timestamp, baseline.source.endedAt, 'Production timestamp must be subprocess end time');
  const delta = Date.parse(candidateTimestamp) - Date.parse(baseline.timestamp);
  assert.ok(Number.isFinite(delta) && delta >= 0 && delta <= MAX_PAIR_AGE_MS,
    'Production and candidate must be within 24 hours, with production first');
  assert.equal(baseline.truthSetDigest, suite === 'text' ? TEXT_TRUTH_SET_DIGEST : BCRS_TRUTH_SET_DIGEST,
    'Production truth set mismatch');
  if (suite === 'text') {
    assert.equal(baseline.reports.length, 1, 'Production text report is incomplete');
    const report = baseline.reports[0];
    assert.equal(baseline.testSetSize, TEST_ITEMS.length);
    assert.equal(report.totalItems, TEST_ITEMS.length);
    assertCaseIds(report.results.map((entry) => entry.text), TEST_ITEMS.map((entry) => entry.text), 'Production text');
    assert.equal(report.errors, 0, 'Production text has errors');
    assert.deepEqual(baseline.gates.map((gate) => gate.measurementValid), [true]);
    assert.ok(report.results.every((entry) => entry.error === undefined && entry.actual !== null), 'Production text has case errors');
    for (const entry of report.results) {
      assert.ok(entry.actual && typeof entry.actual === 'object', 'Production text has no actual result');
      const actual = entry.actual as { channel: unknown; status: unknown; confidence: number };
      ChannelTypeSchema.nullable().parse(actual.channel);
      ClassifyStatusSchema.parse(actual.status);
      assert.ok(Number.isFinite(actual.confidence) && actual.confidence >= 0 && actual.confidence <= 1,
        'Production text confidence is invalid');
    }
  } else {
    const expected = [...BCRS_TEXT_CASES, ...BCRS_IMAGE_CASES].map((entry) => entry.id);
    assertCaseIds(baseline.results.map((entry) => entry.id), expected, 'Production BCRS');
    assert.equal(baseline.runKind, 'complete');
    assert.equal(baseline.gate.completeSuite, true);
    assert.equal(baseline.gate.measurementValid, true);
    assert.equal(baseline.gate.total, expected.length);
    assert.equal(baseline.gate.holdoutTotal, BCRS_IMAGE_CASES.filter((entry) => entry.partition === 'holdout').length);
    assert.equal(baseline.gate.providerErrors, 0, 'Production BCRS has errors');
    assert.ok(baseline.results.every((entry) => entry.error === undefined && entry.actual !== null), 'Production BCRS has case errors');
    for (const entry of baseline.results) ClassifyResultSchema.parse(entry.actual);
  }
}
