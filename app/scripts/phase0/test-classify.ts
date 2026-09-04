/**
 * Versioned classification accuracy baseline: answerable text cases with
 * per-channel and unsafe-diversion gates.
 *
 * This is the only thing that exercises the classifier end to end against known
 * answers, and it matters more now than when there were two providers to fall back
 * between: TokenHub is the sole route, so a regression here is a regression in
 * production. Run it after any change to the model ids or the system prompt.
 *
 * It costs money — one paid call per case, plus any transient retries — but at the
 * cheap tier that is a rounding error against one wrong answer shipped to users.
 *
 * Usage:
 *   npm run test:classify
 *   npm run test:classify -- --profile=production
 * Requires: TOKENHUB_API_KEY in .env
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { TEST_ITEMS, TEXT_BASELINE, getItemsByChannel, type TestItem } from './test-items';
import {
  classifyItem,
  type ClassificationExecutionPolicy,
} from '../../src/lib/ai/provider';
import {
  TOKENHUB_TEXT_MODEL,
  TokenHubProvider,
} from '../../src/lib/ai/providers/tokenhub';
import type { ClassifyProvider, ClassifyResult } from '../../src/lib/ai/types';
import {
  PRODUCTION_PROFILE,
  profileDigest,
  selectProfile,
} from './baseline-profiles';
import {
  TEXT_GATE_THRESHOLDS,
  TEXT_SAFETY_CHANNELS,
  TEXT_TRUTH_SET_DIGEST,
} from './release-contract';

// Load .env from app directory
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

interface TestResult {
  item: TestItem;
  result: ClassifyResult | null;
  error?: string;
  channelMatch: boolean;
  statusMatch: boolean;
  durationMs: number;
}

interface ProviderReport {
  provider: string;
  totalItems: number;
  channelAccuracy: number;
  statusAccuracy: number;
  exactAccuracy: number;
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

interface StoredReport {
  totalItems: number;
  exactAccuracy: number;
  channelAccuracy: number;
  statusAccuracy: number;
  notSureCount: number;
  errors: number;
  perChannel: Record<string, { correct: number }>;
  results: Array<{
    text: string;
    channelMatch: boolean;
    statusMatch: boolean;
  }>;
}

interface StoredBaseline {
  timestamp: string;
  truthSetDigest: string;
  testSetSize: number;
  profile: { id: string; revision: string; digest: string };
  gates: Array<{ measurementValid: boolean }>;
  reports: StoredReport[];
}

interface BaselineComparison {
  productionProfile: string;
  exactAccuracyDelta: number;
  channelAccuracyDelta: number;
  statusAccuracyDelta: number;
  notSureCountDelta: number;
  regressedExactCases: string[];
  regressedChannels: string[];
  pass: boolean;
}

const MAX_BASELINE_PAIR_AGE_MS = 24 * 60 * 60 * 1000;

function evaluateReport(report: ProviderReport) {
  const exactPass = report.exactAccuracy >= TEXT_GATE_THRESHOLDS.exactAccuracy;
  const channelPass = report.channelAccuracy >= TEXT_GATE_THRESHOLDS.channelAccuracy;
  const statusPass = report.statusAccuracy >= TEXT_GATE_THRESHOLDS.statusAccuracy;
  const notSurePass = report.notSureRate < TEXT_GATE_THRESHOLDS.maxUnexpectedNotSureRate;
  const perChannelPass = Object.values(report.perChannel).every(
    (stats) => stats.accuracy >= TEXT_GATE_THRESHOLDS.perChannelAccuracy,
  );
  const errorsPass = report.errors <= TEXT_GATE_THRESHOLDS.maxProviderErrors;
  const safetyPass = report.unsafeDiversions <= TEXT_GATE_THRESHOLDS.maxUnsafeDiversions;
  return {
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
  };
}

function parseArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * ratio) - 1];
}

function readProductionBaseline(truthSetDigest: string): StoredBaseline {
  const baselinePath = path.join(
    __dirname,
    'baselines',
    TEXT_BASELINE.id,
    'production-0a5852f.json',
  );
  if (!fs.existsSync(baselinePath)) {
    throw new Error(
      `Production baseline is missing: ${baselinePath}. Run --profile=production first.`,
    );
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as StoredBaseline;
  if (baseline.truthSetDigest !== truthSetDigest) {
    throw new Error(
      `Production baseline uses truth set ${baseline.truthSetDigest}, current is ${truthSetDigest}. ` +
      'Re-run --profile=production before evaluating this candidate.',
    );
  }
  if (baseline.reports.length !== 1) {
    throw new Error('Production baseline must contain exactly one provider report.');
  }
  const expectedProfileDigest = profileDigest(PRODUCTION_PROFILE);
  if (
    baseline.profile.id !== PRODUCTION_PROFILE.id ||
    baseline.profile.revision !== PRODUCTION_PROFILE.revision ||
    baseline.profile.digest !== expectedProfileDigest
  ) {
    throw new Error('Production baseline profile identity does not match the frozen production contract.');
  }
  const report = baseline.reports[0];
  if (
    baseline.testSetSize !== TEST_ITEMS.length ||
    report.totalItems !== TEST_ITEMS.length ||
    report.results.length !== TEST_ITEMS.length
  ) {
    throw new Error('Production baseline does not contain the complete current text suite.');
  }
  const expectedTexts = new Set(TEST_ITEMS.map((item) => item.text));
  const baselineTexts = new Set(report.results.map((result) => result.text));
  if (
    baselineTexts.size !== expectedTexts.size ||
    [...expectedTexts].some((text) => !baselineTexts.has(text))
  ) {
    throw new Error('Production baseline case IDs do not match the complete current text suite.');
  }
  if (report.errors !== 0 || baseline.gates.length !== 1 || !baseline.gates[0].measurementValid) {
    throw new Error('Production baseline is not a valid zero-provider-error measurement.');
  }
  const baselineTimestamp = Date.parse(baseline.timestamp);
  if (
    !Number.isFinite(baselineTimestamp) ||
    Date.now() - baselineTimestamp > MAX_BASELINE_PAIR_AGE_MS ||
    baselineTimestamp > Date.now() + 60_000
  ) {
    throw new Error('Production baseline is outside the 24-hour candidate comparison window.');
  }
  return baseline;
}

function compareWithProduction(
  report: ProviderReport,
  baseline: StoredBaseline,
): BaselineComparison {
  const production = baseline.reports[0];
  const candidateByText = new Map(report.results.map((result) => [result.item.text, result]));
  const regressedExactCases = production.results
    .filter((result) => {
      const candidate = candidateByText.get(result.text);
      if (!candidate) throw new Error(`Candidate is missing baseline case: ${result.text}`);
      const productionExact = result.channelMatch && result.statusMatch;
      return productionExact && !(candidate.channelMatch && candidate.statusMatch);
    })
    .map((result) => result.text);

  if (candidateByText.size !== production.results.length) {
    throw new Error(
      `Candidate has ${candidateByText.size} cases but production baseline has ${production.results.length}.`,
    );
  }

  const regressedChannels = Object.entries(production.perChannel)
    .filter(([channel, stats]) => (report.perChannel[channel]?.correct ?? -1) < stats.correct)
    .map(([channel]) => channel);
  const exactAccuracyDelta = report.exactAccuracy - production.exactAccuracy;
  const channelAccuracyDelta = report.channelAccuracy - production.channelAccuracy;
  const statusAccuracyDelta = report.statusAccuracy - production.statusAccuracy;
  const notSureCountDelta = report.notSureCount - production.notSureCount;
  const pass = exactAccuracyDelta >= 0 &&
    channelAccuracyDelta >= 0 &&
    statusAccuracyDelta >= 0 &&
    notSureCountDelta <= 0 &&
    regressedExactCases.length === 0 &&
    regressedChannels.length === 0;

  return {
    productionProfile: baseline.profile.id,
    exactAccuracyDelta,
    channelAccuracyDelta,
    statusAccuracyDelta,
    notSureCountDelta,
    regressedExactCases,
    regressedChannels,
    pass,
  };
}

async function testProvider(
  provider: ClassifyProvider,
  executionPolicy: ClassificationExecutionPolicy,
): Promise<ProviderReport> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${provider.name}`);
  console.log('='.repeat(60));

  const results: TestResult[] = [];
  let channelCorrect = 0;
  let statusCorrect = 0;
  let exactCorrect = 0;
  let notSureCount = 0;
  let totalConfidence = 0;
  let totalDuration = 0;
  let errorCount = 0;
  let unsafeDiversions = 0;

  for (let i = 0; i < TEST_ITEMS.length; i++) {
    const item = TEST_ITEMS[i];
    const startTime = Date.now();

    try {
      // Exercise the same deadline, retry and schema boundary used in production.
      const result = await classifyItem({ text: item.text }, provider, executionPolicy);
      const duration = Date.now() - startTime;

      const channelMatch = result.channel === item.expectedChannel;
      const statusMatch = result.status === item.expectedStatus;

      if (channelMatch) channelCorrect++;
      if (statusMatch) statusCorrect++;
      if (channelMatch && statusMatch) exactCorrect++;
      if (result.status === 'not_sure') notSureCount++;
      if (
        TEXT_SAFETY_CHANNELS.has(item.expectedChannel) &&
        result.channel !== null &&
        result.channel !== item.expectedChannel
      ) {
        unsafeDiversions++;
      }
      totalConfidence += result.confidence;
      totalDuration += duration;

      const icon = channelMatch ? 'OK' : 'XX';
      console.log(
        `  [${String(i + 1).padStart(2)}/${TEST_ITEMS.length}] ${icon} "${item.text}" -> ${result.channel ?? 'null'} (expected: ${item.expectedChannel}) [${duration}ms]`,
      );

      results.push({ item, result, channelMatch, statusMatch, durationMs: duration });

      // TokenHub publishes no rate limit, so this is deliberate politeness rather
      // than a measured requirement: enough spacing that a full sweep cannot be
      // mistaken for abuse, without stretching the run to Groq's old 6 minutes.
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error) {
      const duration = Date.now() - startTime;
      errorCount++;
      console.log(
        `  [${String(i + 1).padStart(2)}/${TEST_ITEMS.length}] ERR "${item.text}" -> ${(error as Error).message.slice(0, 80)}`,
      );
      results.push({
        item,
        result: null,
        error: (error as Error).message,
        channelMatch: false,
        statusMatch: false,
        durationMs: duration,
      });

      await new Promise((r) => setTimeout(r, 1000));
    }
  }

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
    provider: provider.name,
    totalItems: TEST_ITEMS.length,
    channelAccuracy: channelCorrect / TEST_ITEMS.length,
    statusAccuracy: statusCorrect / TEST_ITEMS.length,
    exactAccuracy: exactCorrect / TEST_ITEMS.length,
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

function printReport(report: ProviderReport): void {
  console.log(`\n--- ${report.provider.toUpperCase()} REPORT ---`);
  console.log(`Channel Accuracy: ${(report.channelAccuracy * 100).toFixed(1)}% (target: >=90%)`);
  console.log(`Status Accuracy:  ${(report.statusAccuracy * 100).toFixed(1)}%`);
  console.log(`Exact Accuracy:   ${(report.exactAccuracy * 100).toFixed(1)}% (target: >=90%)`);
  console.log(`Not Sure Rate:    ${(report.notSureRate * 100).toFixed(1)}% (target: <15%)`);
  console.log(`Avg Confidence:   ${report.avgConfidence.toFixed(2)}`);
  console.log(`Avg Latency:      ${report.avgDurationMs.toFixed(0)}ms`);
  console.log(`P50 / P95:        ${report.p50DurationMs}ms / ${report.p95DurationMs}ms`);
  console.log(`Errors:           ${report.errors}`);
  console.log(`Unsafe diversions:${String(report.unsafeDiversions).padStart(4)} (target: 0)`);
  console.log(`\nPer-Channel Accuracy (target: >=80% each):`);

  for (const [channel, stats] of Object.entries(report.perChannel)) {
    const pass = stats.accuracy >= 0.8 ? 'PASS' : 'FAIL';
    console.log(
      `  ${channel.padEnd(20)} ${stats.correct}/${stats.total} = ${(stats.accuracy * 100).toFixed(0)}% [${pass}]`,
    );
  }

  // Show misclassified items
  const misclassified = report.results.filter((r) => !r.channelMatch && r.result);
  if (misclassified.length > 0) {
    console.log(`\nMisclassified items (${misclassified.length}):`);
    for (const r of misclassified) {
      console.log(
        `  "${r.item.text}" -> ${r.result!.channel} (expected: ${r.item.expectedChannel}) [${r.item.category}]`,
      );
    }
  }
}

async function main() {
  const profile = selectProfile(parseArg('profile'));
  const truthSetDigest = TEXT_TRUTH_SET_DIGEST;
  const productionBaseline = profile.id === 'candidate-working-tree'
    ? readProductionBaseline(truthSetDigest)
    : undefined;

  console.log(`Classification Accuracy Gate`);
  console.log(`Baseline: ${TEXT_BASELINE.id} (${truthSetDigest})`);
  console.log(`Profile: ${profile.id} (${profileDigest(profile)})`);
  console.log(`Test set: ${TEST_ITEMS.length} items`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  if (!process.env.TOKENHUB_API_KEY) {
    console.error('TOKENHUB_API_KEY not set in .env');
    process.exit(1);
  }

  const reports: ProviderReport[] = [];
  const report = await testProvider(
    new TokenHubProvider(undefined, profile.providerOptions),
    profile.executionPolicy,
  );
  reports.push(report);
  printReport(report);
  const comparison = productionBaseline
    ? compareWithProduction(report, productionBaseline)
    : undefined;

  // Save results to JSON
  const outputDirectory = profile.id === 'production-0a5852f'
    ? path.join(__dirname, 'baselines', TEXT_BASELINE.id)
    : path.join(__dirname, 'results');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputPath = profile.id === 'production-0a5852f'
    ? path.join(outputDirectory, `${profile.id}.json`)
    : path.join(outputDirectory, `classify-${Date.now()}.json`);
  const output = {
    timestamp: new Date().toISOString(),
    baseline: TEXT_BASELINE,
    truthSetDigest,
    profile: {
      id: profile.id,
      revision: profile.revision,
      digest: profileDigest(profile),
    },
    models: { text: profile.providerOptions.textModel ?? TOKENHUB_TEXT_MODEL },
    thresholds: TEXT_GATE_THRESHOLDS,
    testSetSize: TEST_ITEMS.length,
    gates: reports.map((entry) => evaluateReport(entry)),
    comparison,
    reports: reports.map((r) => ({
      ...r,
      results: r.results.map((tr) => ({
        text: tr.item.text,
        expected: { channel: tr.item.expectedChannel, status: tr.item.expectedStatus },
        actual: tr.result ? { channel: tr.result.channel, status: tr.result.status, confidence: tr.result.confidence } : null,
        channelMatch: tr.channelMatch,
        statusMatch: tr.statusMatch,
        durationMs: tr.durationMs,
        error: tr.error,
      })),
    })),
  };
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  // Go/No-Go gate check
  console.log('\n\n' + '='.repeat(60));
  console.log('GO/NO-GO GATE CHECK');
  console.log('='.repeat(60));

  let allPass = true;
  for (const report of reports) {
    const gate = evaluateReport(report);

    console.log(`\n${report.provider}:`);
    console.log(`  Exact >=90%:      ${gate.exactPass ? 'PASS' : 'FAIL'} (${(report.exactAccuracy * 100).toFixed(1)}%)`);
    console.log(`  Channel >=90%:    ${gate.channelPass ? 'PASS' : 'FAIL'} (${(report.channelAccuracy * 100).toFixed(1)}%)`);
    console.log(`  Status >=90%:     ${gate.statusPass ? 'PASS' : 'FAIL'} (${(report.statusAccuracy * 100).toFixed(1)}%)`);
    console.log(`  Per-channel >=80%:${gate.perChannelPass ? 'PASS' : 'FAIL'}`);
    console.log(`  Not-sure <15%:    ${gate.notSurePass ? 'PASS' : 'FAIL'} (${(report.notSureRate * 100).toFixed(1)}%)`);
    console.log(`  Provider errors:  ${gate.errorsPass ? 'PASS' : 'FAIL'} (${report.errors})`);
    console.log(`  Unsafe diversion: ${gate.safetyPass ? 'PASS' : 'FAIL'} (${report.unsafeDiversions})`);

    if (!gate.releaseEligible) allPass = false;
  }

  if (comparison) {
    const percentagePoints = (value: number) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}pp`;
    console.log(`\nCompared with ${comparison.productionProfile}:`);
    console.log(`  Exact accuracy:   ${percentagePoints(comparison.exactAccuracyDelta)}`);
    console.log(`  Channel accuracy: ${percentagePoints(comparison.channelAccuracyDelta)}`);
    console.log(`  Status accuracy:  ${percentagePoints(comparison.statusAccuracyDelta)}`);
    console.log(`  Not-sure count:   ${comparison.notSureCountDelta >= 0 ? '+' : ''}${comparison.notSureCountDelta}`);
    console.log(`  Regressed cases:  ${comparison.regressedExactCases.length}`);
    console.log(`  Regressed channels:${String(comparison.regressedChannels.length).padStart(3)}`);
    console.log(`  Monotonic gate:   ${comparison.pass ? 'PASS' : 'FAIL'}`);
    if (!comparison.pass) allPass = false;
  }

  const measurementValid = reports.every((entry) => evaluateReport(entry).measurementValid);
  console.log(`\nMeasurement: ${measurementValid ? 'VALID' : 'INVALID - provider errors make comparison unusable'}`);
  console.log(`Release gate: ${allPass ? 'PASS - Eligible to deploy' : 'FAIL - Not eligible to deploy'}`);
  if (!allPass) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
