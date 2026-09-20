/**
 * Exact BCRS safety gate: four languages plus real-world image recognition.
 *
 * Unlike the broad answerable-text benchmark, every case here is a product
 * invariant. The release gate is deliberately asymmetric: a wrong non-null channel
 * is unsafe and never allowed, while an occasional image-only not_sure is a
 * recoverable request for better evidence and is bounded by explicit utility gates.
 *
 * Usage:
 *   npm run test:classify:bcrs
 *   npm run test:classify:bcrs -- --mode=text
 *   npm run test:classify:bcrs -- --mode=image
 *   npm run test:classify:bcrs -- --mode=image --partition=regression
 *   npm run test:classify:bcrs -- --case=official-mark-present-en
 *
 * Requires TOKENHUB_API_KEY in app/.env. Image bytes are downloaded to a
 * gitignored cache, hash-pinned, and sanitised through the production pipeline.
 */

import { createHash } from 'node:crypto';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';

import {
  IMAGE_QUALITY,
  type ClassifyResult,
  type Locale,
} from '@binwhere/core';

import { classifyItem } from '../../src/lib/ai/provider';
import {
  TOKENHUB_TEXT_MODEL,
  TOKENHUB_VISION_MODEL,
  TokenHubProvider,
} from '../../src/lib/ai/providers/tokenhub';
import { validateAndSanitizeImage } from '../../src/lib/image-security';
import {
  BCRS_BASELINE,
  BCRS_IMAGE_CASES,
  BCRS_IMAGE_SOURCES,
  BCRS_POLICY_SOURCE,
  BCRS_TEXT_CASES,
  type BcrsImageCase,
  type BcrsImageSource,
  type BcrsTextCase,
  type ExpectedClassification,
} from './bcrs-test-cases';
import {
  CANDIDATE_PROFILE,
  PRODUCTION_PROFILE,
  profileDigest,
  selectProfile,
} from './baseline-profiles';
import {
  BCRS_GATE_THRESHOLDS,
  BCRS_TRUTH_SET_DIGEST,
  checkBcrsResult,
  mentionsBlueBin,
  resultText,
} from './release-contract';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const CACHE_DIR = path.join(__dirname, 'fixtures', 'cache');
const RESULTS_DIR = path.join(__dirname, 'results');
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const SOURCE_DOWNLOAD_MS = 20_000;
const CALL_SPACING_MS = 1_000;
const MAX_BASELINE_PAIR_AGE_MS = 24 * 60 * 60 * 1000;
const PERCEPTUAL_FINGERPRINT_SIZE = 64;

type Mode = 'text' | 'image';

interface RegressionResult {
  id: string;
  mode: Mode;
  locale: Locale;
  partition: 'regression' | 'holdout';
  expected: ExpectedClassification;
  actual: ClassifyResult | null;
  assertions: string[];
  durationMs: number;
  sourcePageUrl?: string;
  error?: string;
}

interface StoredProductionBaseline {
  timestamp: string;
  runKind: string;
  truthSetDigest: string;
  profile: { id: string; revision: string; digest: string };
  gate: {
    measurementValid: boolean;
    completeSuite: boolean;
    total: number;
    holdoutTotal: number;
    providerErrors: number;
  };
  results: Array<{ id: string }>;
}

interface ImageSimilarityPair {
  leftSourceId: string;
  rightSourceId: string;
  similarity: number;
}

function parseArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function selectCases(): Array<
  | { mode: 'text'; testCase: BcrsTextCase }
  | { mode: 'image'; testCase: BcrsImageCase }
> {
  const requestedMode = parseArg('mode');
  if (requestedMode && requestedMode !== 'text' && requestedMode !== 'image') {
    throw new Error(`Invalid --mode=${requestedMode}; expected text or image`);
  }
  const requestedPartition = parseArg('partition');
  if (requestedPartition && requestedPartition !== 'regression' && requestedPartition !== 'holdout') {
    throw new Error(`Invalid --partition=${requestedPartition}; expected regression or holdout`);
  }
  if (requestedPartition && requestedMode !== 'image') {
    throw new Error('--partition requires --mode=image');
  }
  const requestedId = parseArg('case');

  const selected = [
    ...(requestedMode === 'image' ? [] : BCRS_TEXT_CASES.map((testCase) => ({ mode: 'text' as const, testCase }))),
    ...(requestedMode === 'text' ? [] : BCRS_IMAGE_CASES.map((testCase) => ({ mode: 'image' as const, testCase }))),
  ].filter((entry) => (
    (!requestedId || entry.testCase.id === requestedId) &&
    (!requestedPartition || (
      entry.mode === 'image' && entry.testCase.partition === requestedPartition
    ))
  ));

  if (selected.length === 0) {
    throw new Error(requestedId ? `Unknown BCRS case: ${requestedId}` : 'No BCRS cases selected');
  }
  return selected;
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function assertProductionBaseline(
  truthSetDigest: string,
  expectedIds: readonly string[],
  expectedHoldoutTotal: number,
): void {
  const baselinePath = path.join(
    __dirname,
    'baselines',
    BCRS_BASELINE.id,
    `${PRODUCTION_PROFILE.id}.json`,
  );
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Production baseline is missing: ${baselinePath}. Run --profile=production first.`);
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as StoredProductionBaseline;
  if (baseline.truthSetDigest !== truthSetDigest) {
    throw new Error('Production BCRS baseline does not use the current frozen truth set.');
  }
  if (
    baseline.profile.id !== PRODUCTION_PROFILE.id ||
    baseline.profile.revision !== PRODUCTION_PROFILE.revision ||
    baseline.profile.digest !== profileDigest(PRODUCTION_PROFILE)
  ) {
    throw new Error('Production BCRS baseline identity does not match the frozen production contract.');
  }
  const baselineIds = new Set(baseline.results.map((result) => result.id));
  if (
    baseline.runKind !== 'complete' ||
    !baseline.gate.completeSuite ||
    baseline.gate.total !== expectedIds.length ||
    baseline.gate.holdoutTotal !== expectedHoldoutTotal ||
    baseline.results.length !== expectedIds.length ||
    baselineIds.size !== expectedIds.length ||
    expectedIds.some((id) => !baselineIds.has(id))
  ) {
    throw new Error('Production BCRS baseline does not contain the complete current suite.');
  }
  if (!baseline.gate.measurementValid || baseline.gate.providerErrors !== 0) {
    throw new Error('Production BCRS baseline is not a valid zero-provider-error measurement.');
  }
  const baselineTimestamp = Date.parse(baseline.timestamp);
  if (
    !Number.isFinite(baselineTimestamp) ||
    Date.now() - baselineTimestamp > MAX_BASELINE_PAIR_AGE_MS ||
    baselineTimestamp > Date.now() + 60_000
  ) {
    throw new Error('Production BCRS baseline is outside the 24-hour candidate comparison window.');
  }
}

async function downloadSource(source: BcrsImageSource): Promise<Buffer> {
  const response = await fetch(source.imageUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(SOURCE_DOWNLOAD_MS),
    headers: { 'User-Agent': 'BinWhere-BCRS-Regression/1.0' },
  });
  if (!response.ok) {
    throw new Error(`Image download failed with HTTP ${response.status}: ${source.sourcePageUrl}`);
  }

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) {
    throw new Error(`Image source exceeds ${MAX_SOURCE_BYTES} bytes: ${source.id}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_SOURCE_BYTES) {
    throw new Error(`Downloaded image exceeds ${MAX_SOURCE_BYTES} bytes: ${source.id}`);
  }
  const actualHash = sha256(buffer);
  if (actualHash !== source.sha256) {
    throw new Error(
      `Image source changed for ${source.id}: expected ${source.sha256}, received ${actualHash}. ` +
      'Review the source again before updating the manifest.',
    );
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, source.filename), buffer);
  return buffer;
}

async function loadSource(source: BcrsImageSource): Promise<Buffer> {
  const cachePath = path.join(CACHE_DIR, source.filename);
  if (fs.existsSync(cachePath)) {
    const cached = fs.readFileSync(cachePath);
    if (sha256(cached) === source.sha256) return cached;
    console.warn(`[fixture] Cached bytes failed hash verification; refreshing ${source.id}`);
  }
  console.log(`[fixture] Downloading real photo: ${source.id}`);
  return downloadSource(source);
}

async function composeFixture(
  source: BcrsImageSource,
  raw: Buffer,
  maxDimension: number,
): Promise<Buffer> {
  let submittedPhoto = raw;
  if (source.crop) {
    submittedPhoto = await sharp(raw)
      .extract(source.crop)
      .toBuffer();
  }

  // Every real user photo reaches the API only after the Web client has converted
  // it to a JPEG at the shared maximum dimension and 70% quality. The API then sanitises and re-encodes it
  // a second time below. Running every fixture through both stages is essential:
  // the small Deposit Mark and barcode are exactly what resampling can erase.
  return sharp(submittedPhoto)
    .rotate()
    .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: Math.round(IMAGE_QUALITY * 100) })
    .toBuffer();
}

async function loadCleanImage(
  source: BcrsImageSource,
  cleanImages: Map<string, string>,
  maxDimension: number,
): Promise<string> {
  const cacheKey = `${source.id}:${maxDimension}`;
  const cached = cleanImages.get(cacheKey);
  if (cached) return cached;

  const raw = await loadSource(source);
  const fixture = await composeFixture(source, raw, maxDimension);
  const image = await validateAndSanitizeImage(fixture.toString('base64'));
  cleanImages.set(cacheKey, image);
  return image;
}

async function perceptualFingerprint(imageBase64: string): Promise<Buffer> {
  return sharp(Buffer.from(imageBase64, 'base64'))
    .resize(PERCEPTUAL_FINGERPRINT_SIZE, PERCEPTUAL_FINGERPRINT_SIZE, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();
}

function perceptualSimilarity(left: Buffer, right: Buffer): number {
  if (left.length !== right.length || left.length === 0) {
    throw new Error('Cannot compare incompatible image fingerprints.');
  }

  let absoluteDifference = 0;
  for (let index = 0; index < left.length; index += 1) {
    absoluteDifference += Math.abs(left[index] - right[index]);
  }
  return 1 - absoluteDifference / (left.length * 255);
}

async function assertDistinctImageSources(
  selected: ReturnType<typeof selectCases>,
  sources: ReadonlyMap<string, BcrsImageSource>,
  cleanImages: Map<string, string>,
  maxDimension: number,
): Promise<ImageSimilarityPair | null> {
  const sourceIds = [...new Set(selected.flatMap((entry) => (
    entry.mode === 'image' ? [entry.testCase.sourceId] : []
  )))];
  const fingerprints = new Map<string, Buffer>();

  for (const sourceId of sourceIds) {
    const source = sources.get(sourceId);
    if (!source) throw new Error(`Missing image source: ${sourceId}`);
    const image = await loadCleanImage(source, cleanImages, maxDimension);
    fingerprints.set(sourceId, await perceptualFingerprint(image));
  }

  let closestPair: ImageSimilarityPair | null = null;
  for (let leftIndex = 0; leftIndex < sourceIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sourceIds.length; rightIndex += 1) {
      const leftSourceId = sourceIds[leftIndex];
      const rightSourceId = sourceIds[rightIndex];
      const similarity = perceptualSimilarity(
        fingerprints.get(leftSourceId)!,
        fingerprints.get(rightSourceId)!,
      );
      if (!closestPair || similarity > closestPair.similarity) {
        closestPair = { leftSourceId, rightSourceId, similarity };
      }
    }
  }

  if (
    closestPair &&
    closestPair.similarity >= BCRS_GATE_THRESHOLDS.nearDuplicateSimilarityLimit
  ) {
    throw new Error(
      'Image-suite independence check failed: ' +
      `${closestPair.leftSourceId} and ${closestPair.rightSourceId} have ` +
      `${closestPair.similarity.toFixed(6)} perceptual similarity after the complete production image path ` +
      `(limit ${BCRS_GATE_THRESHOLDS.nearDuplicateSimilarityLimit}).`,
    );
  }
  return closestPair;
}

async function main() {
  if (!process.env.TOKENHUB_API_KEY) {
    throw new Error('TOKENHUB_API_KEY not set in app/.env');
  }

  const selected = selectCases();
  const diagnosticRun = Boolean(parseArg('mode') || parseArg('case') || parseArg('partition'));
  const expectedTotal = BCRS_TEXT_CASES.length + BCRS_IMAGE_CASES.length;
  const expectedHoldoutTotal = BCRS_IMAGE_CASES.filter(
    (testCase) => testCase.partition === 'holdout',
  ).length;
  const completeSuite = !diagnosticRun && selected.length === expectedTotal;
  const profile = selectProfile(parseArg('profile'));
  const provider = new TokenHubProvider(undefined, profile.providerOptions);
  const sources = new Map(BCRS_IMAGE_SOURCES.map((source) => [source.id, source]));
  const cleanImages = new Map<string, string>();
  const results: RegressionResult[] = [];
  const truthSetDigest = BCRS_TRUTH_SET_DIGEST;

  if (profile.id === CANDIDATE_PROFILE.id && completeSuite) {
    assertProductionBaseline(
      truthSetDigest,
      selected.map(({ testCase }) => testCase.id),
      expectedHoldoutTotal,
    );
  }

  console.log('BCRS exact classification gate');
  console.log(`Baseline: ${BCRS_BASELINE.id} (${truthSetDigest})`);
  console.log(`Profile: ${profile.id} (${profileDigest(profile)})`);
  console.log(`Cases: ${selected.length} (${selected.filter((entry) => entry.mode === 'text').length} text, ${selected.filter((entry) => entry.mode === 'image').length} image)`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  const closestImagePair = completeSuite
    ? await assertDistinctImageSources(selected, sources, cleanImages, profile.imageMaxSize)
    : null;
  if (closestImagePair) {
    console.log(
      `Image independence: PASS (closest ${closestImagePair.leftSourceId} / ` +
      `${closestImagePair.rightSourceId} = ${closestImagePair.similarity.toFixed(6)}, ` +
      `limit ${BCRS_GATE_THRESHOLDS.nearDuplicateSimilarityLimit})\n`,
    );
  }

  for (let index = 0; index < selected.length; index += 1) {
    const entry = selected[index];
    const startedAt = Date.now();
    let source: BcrsImageSource | undefined;
    try {
      let image: string | undefined;
      let text: string | undefined;
      if (entry.mode === 'text') {
        text = entry.testCase.text;
      } else {
        source = sources.get(entry.testCase.sourceId);
        if (!source) throw new Error(`Missing image source: ${entry.testCase.sourceId}`);
        image = await loadCleanImage(source, cleanImages, profile.imageMaxSize);
      }

      const result = await classifyItem(
        { image, text, locale: entry.testCase.locale },
        provider,
        profile.executionPolicy,
      );
      const assertions = checkBcrsResult(entry.testCase, result, entry.testCase.locale, profile.providerOptions.nextActions);
      const durationMs = Date.now() - startedAt;
      results.push({
        id: entry.testCase.id,
        mode: entry.mode,
        locale: entry.testCase.locale,
        partition: entry.mode === 'image' ? entry.testCase.partition : 'regression',
        expected: entry.testCase,
        actual: result,
        assertions,
        durationMs,
        sourcePageUrl: source?.sourcePageUrl,
      });
      console.log(
        `[${String(index + 1).padStart(2)}/${selected.length}] ${assertions.length === 0 ? 'PASS' : 'FAIL'} ` +
        `${entry.testCase.id} -> ${result.status}/${result.channel ?? 'null'} ` +
        `confidence=${result.confidence.toFixed(2)} [${durationMs}ms]`,
      );
      for (const failure of assertions) console.log(`     - ${failure}`);
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = (error as Error).message;
      results.push({
        id: entry.testCase.id,
        mode: entry.mode,
        locale: entry.testCase.locale,
        partition: entry.mode === 'image' ? entry.testCase.partition : 'regression',
        expected: entry.testCase,
        actual: null,
        assertions: ['classification completed without error'],
        durationMs,
        sourcePageUrl: source?.sourcePageUrl,
        error: message,
      });
      console.log(`[${String(index + 1).padStart(2)}/${selected.length}] ERROR ${entry.testCase.id} [${durationMs}ms]`);
      console.log(`     - ${message}`);
    }

    if (index < selected.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, CALL_SPACING_MS));
    }
  }

  const outputDirectory = profile.id === 'production-0a5852f' && completeSuite
    ? path.join(__dirname, 'baselines', BCRS_BASELINE.id)
    : RESULTS_DIR;
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputPath = profile.id === 'production-0a5852f' && completeSuite
    ? path.join(outputDirectory, `${profile.id}.json`)
    : path.join(outputDirectory, `bcrs-${Date.now()}.json`);
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
      (!profile.providerOptions.nextActions || result.assertions.length === 0);
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
    holdoutSafetyPassed === holdout.length;
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    runKind: completeSuite ? 'complete' : 'diagnostic',
    baseline: BCRS_BASELINE,
    truthSetDigest,
    profile: {
      id: profile.id,
      revision: profile.revision,
      digest: profileDigest(profile),
    },
    models: {
      text: profile.providerOptions.textModel ?? TOKENHUB_TEXT_MODEL,
      image: profile.providerOptions.visionModel ?? TOKENHUB_VISION_MODEL,
    },
    policySource: BCRS_POLICY_SOURCE,
    imagePipeline: `web <=${profile.imageMaxSize}px JPEG quality ${Math.round(IMAGE_QUALITY * 100)}, then production server sanitiser`,
    imageIndependence: {
      nearDuplicateSimilarityLimit: BCRS_GATE_THRESHOLDS.nearDuplicateSimilarityLimit,
      closestPair: closestImagePair,
    },
    sources: BCRS_IMAGE_SOURCES,
    gate: {
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
    },
    results,
  }, null, 2));

  console.log(`\nMeasurement: ${measurementValid ? 'VALID' : 'INVALID'} (provider errors=${providerErrors})`);
  console.log(`Text exact: ${textPassed}/${textResults.length}`);
  console.log(`Image exact: ${imagePassed}/${imageResults.length} (${(imageExactAccuracy * 100).toFixed(1)}%)`);
  console.log(`Image return_point recall: ${imageReturnPointsFound}/${imageReturnPointResults.length} (${(imageReturnPointRecall * 100).toFixed(1)}%)`);
  console.log(`Holdout exact: ${holdoutPassed}/${holdout.length}; safety: ${holdoutSafetyPassed}/${holdout.length}`);
  console.log(`Wrong non-null channel: ${wrongChannelDirections}`);
  console.log(`False return_point: ${falseReturnPoints}`);
  console.log(`not_sure responses mentioning blue_bin: ${notSureBlueBinMentions}`);
  console.log(
    completeSuite
      ? `Release gate: ${releaseEligible ? 'PASS' : 'FAIL'} (${passed}/${results.length})`
      : `Diagnostic result: ${assertionsPass ? 'PASS' : 'FAIL'} (${passed}/${results.length}); release gate NOT EVALUATED`,
  );
  console.log(`Results: ${outputPath}`);
  if (completeSuite ? !releaseEligible : !assertionsPass) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
