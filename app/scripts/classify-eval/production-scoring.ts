import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ClassifyResultSchema } from '@binwhere/core';

import { PRODUCTION_PROFILE } from './baseline-profiles';
import { BCRS_BASELINE, BCRS_IMAGE_CASES, BCRS_IMAGE_SOURCES, BCRS_POLICY_SOURCE, BCRS_TEXT_CASES } from './bcrs-test-cases';
import { BCRS_TRUTH_SET_DIGEST, TEXT_TRUTH_SET_DIGEST, TEXT_GATE_THRESHOLDS, checkBcrsResult } from './release-contract';
import { TEST_ITEMS, TEXT_BASELINE } from './test-items';
import { currentManifestCases } from './production-manifest';
import { productionProfileDigest, validateProductionRaw } from './production-validation';
import { evaluateReport, scoreBcrsResults, scoreTextResults, serializeTextReport } from './scoring';
import type { ProductionRawOutput } from './production-types';

/** Truth and application-copy assertions are the same ones used by the candidate. */
export function scoreProductionRaw(raw: ProductionRawOutput) {
  validateProductionRaw(raw);
  const byId = new Map(raw.results.map((entry) => [entry.id, entry]));
  const manifest = currentManifestCases();
  const report = scoreTextResults(TEST_ITEMS.map((item, index) => {
    const entry = byId.get(manifest[index].id)!;
    const result = ClassifyResultSchema.parse(entry.result);
    return { item, result, durationMs: entry.durationMs,
      channelMatch: result.channel === item.expectedChannel, statusMatch: result.status === item.expectedStatus };
  }), false);
  const sourceMap = new Map(BCRS_IMAGE_SOURCES.map((source) => [source.id, source]));
  const results = [
    ...BCRS_TEXT_CASES.map((testCase) => ({ mode: 'text' as const, partition: 'regression' as const, testCase })),
    ...BCRS_IMAGE_CASES.map((testCase) => ({ mode: 'image' as const, partition: testCase.partition, testCase })),
  ].map(({ mode, partition, testCase }) => {
    const entry = byId.get(testCase.id)!;
    const actual = ClassifyResultSchema.parse(entry.result);
    return {
      id: testCase.id, mode, locale: testCase.locale, partition, expected: testCase, actual,
      assertions: checkBcrsResult({ ...testCase, expectedItemKind: undefined }, actual, testCase.locale, true), durationMs: entry.durationMs,
      sourcePageUrl: 'sourceId' in testCase ? sourceMap.get(testCase.sourceId)?.sourcePageUrl : undefined,
    };
  });
  const { gate } = scoreBcrsResults(results, true,
    BCRS_IMAGE_CASES.filter((entry) => entry.partition === 'holdout').length);
  const common = {
    timestamp: raw.source.endedAt,
    profile: { ...PRODUCTION_PROFILE, digest: productionProfileDigest(raw.source) },
    source: raw.source,
  };
  return {
    text: {
      ...common, baseline: TEXT_BASELINE, truthSetDigest: TEXT_TRUTH_SET_DIGEST,
      models: { text: raw.source.models.text }, thresholds: TEXT_GATE_THRESHOLDS, testSetSize: TEST_ITEMS.length,
      gates: [evaluateReport(report, false)], reports: [serializeTextReport(report)],
    },
    bcrs: {
      ...common, runKind: 'complete', baseline: BCRS_BASELINE, truthSetDigest: BCRS_TRUTH_SET_DIGEST,
      models: raw.source.models, policySource: BCRS_POLICY_SOURCE,
      imagePipeline: `web <=${raw.source.imagePipeline.maxSize}px JPEG quality ${Math.round(raw.source.imagePipeline.quality * 100)}, then production server sanitiser`,
      imageIndependence: raw.source.imageIndependence, sources: BCRS_IMAGE_SOURCES, gate, results,
    },
  };
}

export function writeProductionBaselines(raw: ProductionRawOutput, directory = join(__dirname, 'baselines')) {
  // Validate and score before creating anything: a dry run can never leave baseline files.
  const scored = scoreProductionRaw(raw);
  const written: string[] = [];
  for (const baseline of [scored.text, scored.bcrs]) {
    const outputDirectory = join(directory, baseline.baseline.id);
    mkdirSync(outputDirectory, { recursive: true });
    const output = join(outputDirectory, `${PRODUCTION_PROFILE.id}.json`);
    writeFileSync(output, JSON.stringify(baseline, null, 2));
    written.push(output);
  }
  return written;
}
