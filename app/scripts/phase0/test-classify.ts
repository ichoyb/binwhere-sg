/**
 * Classification accuracy gate: 85 items, per-channel thresholds.
 *
 * This is the only thing that exercises the classifier end to end against known
 * answers, and it matters more now than when there were two providers to fall back
 * between: TokenHub is the sole route, so a regression here is a regression in
 * production. Run it after any change to the model ids or the system prompt.
 *
 * It costs money — at least 85 paid calls, plus any transient retries — but at the
 * cheap tier that is a rounding error against one wrong answer shipped to users.
 *
 * Usage: npx tsx scripts/phase0/test-classify.ts
 * Requires: TOKENHUB_API_KEY in .env
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { TEST_ITEMS, getItemsByChannel, type TestItem } from './test-items';
import { classifyItem } from '../../src/lib/ai/provider';
import { TokenHubProvider } from '../../src/lib/ai/providers/tokenhub';
import type { ClassifyProvider, ClassifyResult } from '../../src/lib/ai/types';

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
  notSureCount: number;
  notSureRate: number;
  perChannel: Record<string, { total: number; correct: number; accuracy: number }>;
  avgConfidence: number;
  avgDurationMs: number;
  errors: number;
  results: TestResult[];
}

async function testProvider(provider: ClassifyProvider): Promise<ProviderReport> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${provider.name}`);
  console.log('='.repeat(60));

  const results: TestResult[] = [];
  let channelCorrect = 0;
  let statusCorrect = 0;
  let notSureCount = 0;
  let totalConfidence = 0;
  let totalDuration = 0;
  let errorCount = 0;

  for (let i = 0; i < TEST_ITEMS.length; i++) {
    const item = TEST_ITEMS[i];
    const startTime = Date.now();

    try {
      // Exercise the same deadline, retry and schema boundary used in production.
      const result = await classifyItem({ text: item.text }, provider);
      const duration = Date.now() - startTime;

      const channelMatch = result.channel === item.expectedChannel;
      const statusMatch = result.status === item.expectedStatus;

      if (channelMatch) channelCorrect++;
      if (statusMatch) statusCorrect++;
      if (result.status === 'not_sure') notSureCount++;
      totalConfidence += result.confidence;
      totalDuration += duration;

      const icon = channelMatch ? 'OK' : 'XX';
      console.log(
        `  [${String(i + 1).padStart(2)}/${TEST_ITEMS.length}] ${icon} "${item.text}" -> ${result.channel ?? 'null'} (expected: ${item.expectedChannel}) [${duration}ms]`,
      );

      results.push({ item, result, channelMatch, statusMatch, durationMs: duration });

      // TokenHub publishes no rate limit, so this is deliberate politeness rather
      // than a measured requirement: enough spacing that an 85-item sweep cannot be
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
    notSureCount,
    notSureRate: notSureCount / TEST_ITEMS.length,
    perChannel,
    avgConfidence: totalConfidence / (TEST_ITEMS.length - errorCount || 1),
    avgDurationMs: totalDuration / (TEST_ITEMS.length - errorCount || 1),
    errors: errorCount,
    results,
  };

  return report;
}

function printReport(report: ProviderReport): void {
  console.log(`\n--- ${report.provider.toUpperCase()} REPORT ---`);
  console.log(`Channel Accuracy: ${(report.channelAccuracy * 100).toFixed(1)}% (target: >90%)`);
  console.log(`Status Accuracy:  ${(report.statusAccuracy * 100).toFixed(1)}%`);
  console.log(`Not Sure Rate:    ${(report.notSureRate * 100).toFixed(1)}% (target: <15%)`);
  console.log(`Avg Confidence:   ${report.avgConfidence.toFixed(2)}`);
  console.log(`Avg Latency:      ${report.avgDurationMs.toFixed(0)}ms`);
  console.log(`Errors:           ${report.errors}`);
  console.log(`\nPer-Channel Accuracy (target: >80% each):`);

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
  console.log(`Classification Accuracy Gate`);
  console.log(`Test set: ${TEST_ITEMS.length} items`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  if (!process.env.TOKENHUB_API_KEY) {
    console.error('TOKENHUB_API_KEY not set in .env');
    process.exit(1);
  }

  const reports: ProviderReport[] = [];
  const report = await testProvider(new TokenHubProvider());
  reports.push(report);
  printReport(report);

  // Save results to JSON
  const outputPath = path.join(__dirname, 'results', `classify-${Date.now()}.json`);
  const output = {
    timestamp: new Date().toISOString(),
    testSetSize: TEST_ITEMS.length,
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
    const overallPass = report.channelAccuracy >= 0.9;
    const notSurePass = report.notSureRate < 0.15;
    const channelPasses = Object.values(report.perChannel).every((s) => s.accuracy >= 0.8);
    const errorsPass = report.errors === 0;

    console.log(`\n${report.provider}:`);
    console.log(`  Overall >90%:     ${overallPass ? 'PASS' : 'FAIL'} (${(report.channelAccuracy * 100).toFixed(1)}%)`);
    console.log(`  Per-channel >80%: ${channelPasses ? 'PASS' : 'FAIL'}`);
    console.log(`  Not-sure <15%:    ${notSurePass ? 'PASS' : 'FAIL'} (${(report.notSureRate * 100).toFixed(1)}%)`);
    console.log(`  Provider errors:  ${errorsPass ? 'PASS' : 'FAIL'} (${report.errors})`);

    if (!overallPass || !channelPasses || !notSurePass || !errorsPass) allPass = false;
  }

  console.log(`\nGate: ${allPass ? 'PASS - Ready to proceed' : 'FAIL - Adjust system prompt and retest'}`);
  if (!allPass) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
