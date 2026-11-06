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
 *   npm run baseline:production -- --worktree=<absolute-path> --output=<absolute-path>
 * Requires: TOKENHUB_API_KEY in .env
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { validateProductionBaseline } from './production-validation';
import { scoreTextResults, serializeTextReport, evaluateReport, type TestResult, type ProviderReport } from './scoring';
import { TEST_ITEMS, TEXT_BASELINE } from './test-items';
import {
  classifyItem,
  type ClassificationExecutionPolicy,
} from '../../src/lib/ai/provider';
import {
  TOKENHUB_TEXT_MODEL,
  TokenHubProvider,
} from '../../src/lib/ai/providers/tokenhub';
import type { ClassifyProvider } from '../../src/lib/ai/types';
import {
  PRODUCTION_PROFILE,
  profileDigest,
  selectProfile,
} from './baseline-profiles';
import {
  TEXT_GATE_THRESHOLDS,
  TEXT_TRUTH_SET_DIGEST,
} from './release-contract';

// Load .env from app directory
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

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

function parseArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function readProductionBaseline(): StoredBaseline {
  const baselinePath = path.join(
    __dirname,
    'baselines',
    TEXT_BASELINE.id,
    `${PRODUCTION_PROFILE.id}.json`,
  );
  if (!fs.existsSync(baselinePath)) {
    throw new Error(
      `Production baseline is missing: ${baselinePath}. Run baseline:production with the ${PRODUCTION_PROFILE.revision.slice(0, 7)} worktree; see docs/classify-eval.md.`,
    );
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as StoredBaseline;
  validateProductionBaseline(baseline, 'text', new Date().toISOString());
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

  for (let i = 0; i < TEST_ITEMS.length; i++) {
    const item = TEST_ITEMS[i];
    const startTime = Date.now();

    try {
      // Exercise the same deadline, retry and schema boundary used in production.
      const result = await classifyItem({ text: item.text }, provider, executionPolicy);
      const duration = Date.now() - startTime;

      const channelMatch = result.channel === item.expectedChannel;
      const statusMatch = result.status === item.expectedStatus;

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

  return scoreTextResults(results);
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
  const productionBaseline = readProductionBaseline();

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
  const comparison = compareWithProduction(report, productionBaseline);

  // Save results to JSON
  const outputDirectory = path.join(__dirname, 'results');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, `classify-${Date.now()}.json`);
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
    reports: reports.map(serializeTextReport),
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
