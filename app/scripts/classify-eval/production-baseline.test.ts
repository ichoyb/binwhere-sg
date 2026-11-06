import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { t, type ClassifyResult, type Locale } from '@binwhere/core';

import { DEFAULT_EXECUTION_POLICY } from '../../src/lib/ai/provider';
import { PRODUCTION_PROFILE, PRODUCTION_REVISION } from './baseline-profiles';
import { BCRS_BASELINE, BCRS_IMAGE_CASES, BCRS_IMAGE_SOURCES, BCRS_TEXT_CASES } from './bcrs-test-cases';
import { TEST_ITEMS, TEXT_BASELINE } from './test-items';
import { CURRENT_MANIFEST_DIGEST, currentManifestCases, exportProductionManifest, manifestDigest } from './production-manifest';
import { PRODUCTION_DEPENDENCIES, PRODUCTION_LOCKFILES, PRODUCTION_MODELS, PRODUCTION_MODULE_PATHS,
  PRODUCTION_NODE_VERSION } from './production-contract';
import { validateProductionBaseline, validateProductionRaw } from './production-validation';
import { scoreProductionRaw, writeProductionBaselines } from './production-scoring';
import { loadSource } from './image-fixtures';
import type { ProductionRawOutput } from './production-types';

const portableCases = currentManifestCases('/machine-a/cache');
assert.equal(manifestDigest(portableCases), manifestDigest(currentManifestCases('/machine-b/cache')));
assert.equal(portableCases.length, TEST_ITEMS.length + BCRS_TEXT_CASES.length + BCRS_IMAGE_CASES.length);
for (const mutate of [
  (cases: typeof portableCases) => { cases[0].id += '-changed'; },
  (cases: typeof portableCases) => { cases[0].mode = 'image'; },
  (cases: typeof portableCases) => { cases[0].locale = 'zh'; },
  (cases: typeof portableCases) => { cases[0].text += ' changed'; },
  (cases: typeof portableCases) => { cases.at(-1)!.image!.sha256 = 'changed'; },
  (cases: typeof portableCases) => { cases.at(-1)!.image!.crop = { left: 0, top: 0, width: 1, height: 1 }; },
]) {
  const changed = structuredClone(portableCases);
  mutate(changed);
  assert.notEqual(manifestDigest(changed), CURRENT_MANIFEST_DIGEST, 'Every portable input must affect the manifest');
}

function answer(channel: ClassifyResult['channel'], status: ClassifyResult['status'], locale: Locale = 'en', check = false): ClassifyResult {
  const returned = channel === 'return_point';
  const result: ClassifyResult = {
    item: 'container', channel, status, confidence: channel === null ? 0.49 : 0.95,
    reason: t(locale, returned ? 'bcrs.classifyReason' : channel === null ? 'classify.notSureReason' : 'classify.cleanGlassReason'),
    preparation: returned ? [t(locale, 'bcrs.step1'), t(locale, 'bcrs.step2'), t(locale, 'bcrs.step3'), t(locale, 'bcrs.step4')]
      : [t(locale, channel === null ? 'classify.notSurePreparation' : 'classify.cleanGlassPreparation')],
  };
  if (returned) result.tip = t(locale, 'bcrs.refundAmount');
  if (returned || check) {
    const kind = returned ? 'return' : 'check';
    result.next_action = { type: returned ? 'return_container' : 'check_container_type', channel: 'return_point',
      title: t(locale, `action.${kind}.title`), instruction: t(locale, `action.${kind}.instruction`),
      qualification: t(locale, `action.${kind}.qualification`) };
  }
  return result;
}

const expectedBcrs = new Map([...BCRS_TEXT_CASES, ...BCRS_IMAGE_CASES].map((entry) => [entry.id, entry]));
const sourceIds = [...new Set(portableCases.flatMap((entry) => entry.image ? [entry.image.sourceId] : []))];
const raw: ProductionRawOutput = {
  schemaVersion: 1,
  source: {
    preflight: { revision: PRODUCTION_REVISION, trackedChanges: [], lockfiles: { ...PRODUCTION_LOCKFILES },
      checks: { head: true, trackedChanges: true, lockfiles: true } },
    executionPolicy: { ...DEFAULT_EXECUTION_POLICY },
    manifestDigest: CURRENT_MANIFEST_DIGEST, modulePaths: { ...PRODUCTION_MODULE_PATHS },
    dependencies: { ...PRODUCTION_DEPENDENCIES }, models: { ...PRODUCTION_MODELS }, nodeVersion: PRODUCTION_NODE_VERSION,
    policyFieldsMatch: true, dryRun: false, startedAt: '2026-10-26T16:00:00.000Z', endedAt: '2026-10-26T16:20:00.000Z',
    imagePipeline: { maxSize: 2048, quality: 0.7 },
    preparedImages: sourceIds.map((sourceId) => ({ sourceId, sha256: 'a'.repeat(64) })),
    imageIndependence: { nearDuplicateSimilarityLimit: 0.995,
      closestPair: { leftSourceId: sourceIds[0], rightSourceId: sourceIds[1], similarity: 0.8 } },
  },
  results: portableCases.map((entry, index) => {
    const expected = entry.suite === 'text' ? TEST_ITEMS[index] : expectedBcrs.get(entry.id)!;
    const channel = 'expectedChannel' in expected ? expected.expectedChannel : expected.channel;
    const status = 'expectedStatus' in expected ? expected.expectedStatus : expected.status;
    return { id: entry.id, result: answer(channel, status, entry.locale,
      'nextAction' in expected && expected.nextAction === 'check_container_type'), durationMs: 100 + index };
  }),
};
const candidateTime = '2026-10-26T17:20:00.000Z';
const scored = scoreProductionRaw(raw);
validateProductionRaw(raw);
validateProductionBaseline(scored.text, 'text', candidateTime);
validateProductionBaseline(scored.bcrs, 'bcrs', candidateTime);
assert.equal(scored.text.timestamp, raw.source.endedAt);
assert.equal(scored.bcrs.timestamp, raw.source.endedAt);
assert.equal(scored.text.reports[0].exactAccuracy, 1);
assert.equal(scored.bcrs.gate.passed, BCRS_TEXT_CASES.length + BCRS_IMAGE_CASES.length);
assert.equal(scored.bcrs.gate.releaseEligible, true, 'A clean run including the fresh holdouts passes the release gate');
const missedHoldout = structuredClone(raw);
const otherHoldoutId = BCRS_IMAGE_CASES.find((entry) => entry.partition === 'holdout' && entry.channel !== 'return_point')!.id;
missedHoldout.results.find(({ id }) => id === otherHoldoutId)!.result = answer('return_point', 'recyclable');
assert.equal(scoreProductionRaw(missedHoldout).bcrs.gate.releaseEligible, false, 'A false return point on a holdout fails the release gate');
assert.equal(PRODUCTION_PROFILE.id, 'production-b533bdb');
assert.equal(PRODUCTION_REVISION, 'b533bdb96f6042311013b95a36031957b6096681');

const failures: Array<[string, (value: ProductionRawOutput) => void]> = [
  ['revision', (value) => { value.source.preflight.revision = '0'.repeat(40); }],
  ['manifest', (value) => { value.source.manifestDigest = '0'.repeat(64); }],
  ['Node', (value) => { value.source.nodeVersion = 'v22.0.0'; }],
  ['tracked changes', (value) => { value.source.preflight.trackedChanges.push('app/src/lib/ai/provider.ts'); }],
  ['image preparation', (value) => { value.source.preparedImages.pop(); }],
  ['models', (value) => { value.source.models.image = 'kimi-k2.6'; }],
];
for (const file of Object.keys(PRODUCTION_LOCKFILES)) failures.push([`lockfile ${file}`, (value) => { value.source.preflight.lockfiles[file] = '0'.repeat(64); }]);
for (const name of Object.keys(PRODUCTION_DEPENDENCIES) as Array<keyof typeof PRODUCTION_DEPENDENCIES>) {
  failures.push([`version ${name}`, (value) => { value.source.dependencies[name] = '0.0.0'; }]);
}
for (const name of Object.keys(PRODUCTION_MODULE_PATHS)) {
  failures.push([`module ${name}`, (value) => { value.source.modulePaths[name] = '../candidate/node_modules/incorrect.js'; }]);
}
for (const name of Object.keys(DEFAULT_EXECUTION_POLICY) as Array<keyof typeof DEFAULT_EXECUTION_POLICY>) {
  failures.push([`policy ${name}`, (value) => {
    const policy = value.source.executionPolicy as unknown as Record<string, number | boolean>;
    policy[name] = typeof policy[name] === 'boolean' ? !policy[name] : Number(policy[name]) + 1;
  }]);
}
for (const [label, mutate] of failures) {
  const changed = structuredClone(raw);
  mutate(changed);
  assert.throws(() => scoreProductionRaw(changed), Error, `${label} must reject raw scoring`);
  for (const suite of ['text', 'bcrs'] as const) {
    const baseline = structuredClone(scored[suite]);
    baseline.source = changed.source;
    assert.throws(() => validateProductionBaseline(baseline, suite, candidateTime), Error, `${label} must reject ${suite} pairing`);
  }
}
for (const mutate of [
  (value: ProductionRawOutput) => { value.results[0].error = 'provider failed'; },
  (value: ProductionRawOutput) => { value.results[0].result = null; },
  (value: ProductionRawOutput) => { value.results.pop(); },
  (value: ProductionRawOutput) => { value.results[value.results.length - 1] = value.results[0]; },
]) {
  const changed = structuredClone(raw);
  mutate(changed);
  assert.throws(() => scoreProductionRaw(changed));
}
for (const suite of ['text', 'bcrs'] as const) {
  const baseline = structuredClone(scored[suite]);
  assert.throws(() => validateProductionBaseline(baseline, suite, '2026-10-27T16:20:00.001Z'), /24 hours/);
  assert.throws(() => validateProductionBaseline(baseline, suite, '2026-10-26T16:19:59.999Z'), /24 hours/);
  baseline.timestamp = candidateTime;
  assert.throws(() => validateProductionBaseline(baseline, suite, candidateTime), /subprocess end time/);
}
const incompleteText = structuredClone(scored.text);
incompleteText.reports[0].results.pop();
assert.throws(() => validateProductionBaseline(incompleteText, 'text', candidateTime), /incomplete/);
const incompleteBcrs = structuredClone(scored.bcrs);
incompleteBcrs.results.pop();
assert.throws(() => validateProductionBaseline(incompleteBcrs, 'bcrs', candidateTime), /incomplete/);
const erroredText = structuredClone(scored.text);
erroredText.reports[0].results[0].error = 'provider failed';
assert.throws(() => validateProductionBaseline(erroredText, 'text', candidateTime), /case errors/);
const erroredBcrs = JSON.parse(JSON.stringify(scored.bcrs));
erroredBcrs.results[0].error = 'provider failed';
assert.throws(() => validateProductionBaseline(erroredBcrs, 'bcrs', candidateTime), /case errors/);

// Independent score expectations exercise action/copy assertions and asymmetric safety metrics.
const wrongAction = structuredClone(raw);
const imageReturnId = BCRS_IMAGE_CASES.find((entry) => entry.channel === 'return_point')!.id;
delete wrongAction.results.find((entry) => entry.id === imageReturnId)!.result!.next_action;
const wrongActionScore = scoreProductionRaw(wrongAction).bcrs;
assert.equal(wrongActionScore.gate.imagePassed, BCRS_IMAGE_CASES.length - 1);
assert.equal(wrongActionScore.gate.imageReturnPointRecall, 1);
assert.match(wrongActionScore.results.find((entry) => entry.id === imageReturnId)!.assertions.join(), /next_action/);
const wrongCopy = structuredClone(raw);
wrongCopy.results.find((entry) => entry.id === imageReturnId)!.result!.reason = 'MODEL REASON';
assert.match(scoreProductionRaw(wrongCopy).bcrs.results.find((entry) => entry.id === imageReturnId)!.assertions.join(), /application-owned/);
const falseReturn = structuredClone(raw);
const glassId = BCRS_IMAGE_CASES.find((entry) => entry.channel === 'blue_bin')!.id;
falseReturn.results.find((entry) => entry.id === glassId)!.result = answer('return_point', 'recyclable');
const falseReturnGate = scoreProductionRaw(falseReturn).bcrs.gate;
assert.equal(falseReturnGate.falseReturnPoints, 1);
assert.equal(falseReturnGate.wrongChannelDirections, 1);
const wrongText = structuredClone(raw);
const safetyIndex = TEST_ITEMS.findIndex((item) => item.expectedChannel === 'ewaste');
wrongText.results[safetyIndex].result = answer('general_waste', 'not_recyclable');
const textReport = scoreProductionRaw(wrongText).text.reports[0];
assert.equal(textReport.exactAccuracy, (TEST_ITEMS.length - 1) / TEST_ITEMS.length);
assert.equal(textReport.unsafeDiversions, 1);
assert.equal(textReport.perChannel.ewaste.correct, TEST_ITEMS.filter((item) => item.expectedChannel === 'ewaste').length - 1);

// The committed baselines keep every field the scorer writes and the runners and release evidence read.
const storedBaseline = (set: string) => JSON.parse(
  readFileSync(join(__dirname, 'baselines', set, `${PRODUCTION_PROFILE.id}.json`), 'utf8'));
const storedText = storedBaseline(TEXT_BASELINE.id);
const storedBcrs = storedBaseline(BCRS_BASELINE.id);
assert.deepEqual(Object.keys(scored.text).sort(), Object.keys(storedText).sort());
assert.deepEqual(Object.keys(scored.bcrs).sort(), Object.keys(storedBcrs).sort());
assert.deepEqual(Object.keys(scored.text.reports[0]).sort(), Object.keys(storedText.reports[0]).sort());
assert.deepEqual(Object.keys(scored.bcrs.gate).sort(), Object.keys(storedBcrs.gate).sort());

// A worker script may not acquire runtime dependencies from this checkout.
const worker = ts.createSourceFile('production-worker.ts', readFileSync(join(__dirname, 'production-worker.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
for (const statement of worker.statements) {
  if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) continue;
  assert.ok(ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text.startsWith('node:'),
    'Worker runtime imports must be Node builtins');
}

async function checkFiles() {
  const directory = mkdtempSync(join(tmpdir(), 'binwhere-production-test-'));
  const originalFetch = globalThis.fetch;
  try {
    const dryRun = structuredClone(raw);
    dryRun.source.dryRun = true;
    for (const entry of dryRun.results) entry.result = null;
    validateProductionRaw(dryRun, true);
    assert.throws(() => scoreProductionRaw(dryRun), /Dry-run/);
    assert.throws(() => writeProductionBaselines(dryRun, join(directory, 'dry-baselines')), /Dry-run/);
    assert.equal(existsSync(join(directory, 'dry-baselines')), false);
    for (const suite of ['text', 'bcrs'] as const) {
      assert.throws(() => validateProductionBaseline({ ...scored[suite], source: dryRun.source }, suite, candidateTime), /Dry-run/);
    }
    const written = writeProductionBaselines(raw, join(directory, 'baselines'));
    assert.equal(written.length, 2);
    assert.ok(written.every((file) => file.endsWith(`/${PRODUCTION_PROFILE.id}.json`)));
    assert.equal(JSON.parse(readFileSync(written[0], 'utf8')).timestamp, raw.source.endedAt);
    const cache = join(directory, 'cache');
    mkdirSync(cache);
    let downloads = 0;
    globalThis.fetch = async () => { downloads += 1; throw new Error('No network in unit tests'); };
    const manifestOutput = join(directory, 'manifest.json');
    assert.throws(() => exportProductionManifest(manifestOutput, cache), /ENOENT/);
    writeFileSync(join(cache, BCRS_IMAGE_SOURCES[0].filename), 'wrong fixture bytes');
    assert.throws(() => exportProductionManifest(manifestOutput, cache), /SHA-256 mismatch/);
    assert.equal(downloads, 0, 'Export must never download a missing or corrupt image');
    assert.equal(existsSync(manifestOutput), false);
    assert.throws(() => exportProductionManifest(join(__dirname, 'manifest-not-allowed.json'), cache), /outside the repository/);
    const bytes = Buffer.from('offline fixture bytes');
    const fakeSource = { ...BCRS_IMAGE_SOURCES[0], filename: 'unit-fixture.jpg',
      sha256: createHash('sha256').update(bytes).digest('hex') };
    globalThis.fetch = async () => { downloads += 1; return new Response(bytes); };
    assert.deepEqual(await loadSource(fakeSource, cache), bytes);
    assert.equal(downloads, 1);
    assert.deepEqual(await loadSource(fakeSource, cache), bytes);
    assert.equal(downloads, 1, 'Valid cached images must not be downloaded again');
    await assert.rejects(loadSource({ ...fakeSource, filename: 'invalid-fixture.jpg', sha256: '0'.repeat(64) }, cache), /Image source changed/);
    assert.equal(existsSync(join(cache, 'invalid-fixture.jpg')), false);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  }
}

checkFiles().then(() => console.log(`PASS production provenance (${failures.length} identity/policy mutations), portable manifest, dry-run exclusion, scoring and offline prefetch`));
