// Isolated, fixed-plan development experiment. Does not generate release evidence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { AsyncLocalStorage } from 'node:async_hooks';
import { build } from 'esbuild';
import sharp from 'sharp';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const app = path.join(root, 'app');
const output = path.join(app, 'scripts/phase0/results/image-routes-20260920');
const planFile = path.join(here, 'plan.json');
const runtimeFile = path.join(output, 'runtime.cjs');
const revision = 'c34617cc90ee3ebbfe775ec9fc04c5bb36c5cdf9';
const endpoint = 'https://tokenhub.tencentmaas.com/v1/chat/completions';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const require = createRequire(import.meta.url);
const ids = [
  'holdout-singapore-mark-closeup-en',
  'holdout-single-angle-malaysia-can-v7-en',
  'holdout-glass-bottle-action-v17-en',
  'holdout-glass-sprite-action-v18-en',
  'holdout-multiple-containers-collage-v3-en',
  'holdout-single-can-mark-and-barcode-v15-en',
  'holdout-single-bottle-mark-and-barcode-v16-en',
  'official-mark-closeup-en',
  'holdout-foreign-refund-mark-en',
  'holdout-standalone-mark-product-composite-v15-en',
  'holdout-water-bottle-front-action-v17-en',
  'holdout-plastic-sprite-action-v18-en',
];

async function prepare() {
  if (fs.existsSync(planFile)) throw new Error('Plan already frozen; do not overwrite.');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'binwhere-image-route-research-'));
  fs.mkdirSync(output, { recursive: true });
  try {
    const archive = execFileSync('git', ['archive', revision, 'packages/core', 'app/src/lib',
      'app/scripts/phase0/bcrs-test-cases.ts'], { cwd: root, maxBuffer: 30 * 1024 * 1024 });
    execFileSync('tar', ['-x', '-C', temporary], { input: archive });
    const entry = [
      `export * from './app/src/lib/ai/providers/tokenhub';`,
      `export * from './app/src/lib/ai/provider';`,
      `export * from './app/src/lib/image-security';`,
      `export * from './app/scripts/phase0/bcrs-test-cases';`,
      `export { BeverageEvidenceSchema, ClassifyResultSchema } from './packages/core/src/index';`,
    ].join('\n');
    await build({ stdin: { contents: entry, resolveDir: temporary, loader: 'ts' },
      absWorkingDir: temporary, outfile: runtimeFile, bundle: true, platform: 'node', format: 'cjs',
      alias: { '@binwhere/core': path.join(temporary, 'packages/core/src/index.ts'),
        '@': path.join(temporary, 'app/src') },
      nodePaths: [path.join(app, 'node_modules')], external: ['sharp'], logLevel: 'silent' });
    const runtime = require(runtimeFile);
    const previous = JSON.parse(fs.readFileSync(path.join(app,
      'scripts/phase0/results/image-routes-20260919-pixels.json'), 'utf8'));
    const cases = [];
    for (const id of ids) {
      const expected = runtime.BCRS_IMAGE_CASES.find((row) => row.id === id);
      if (!expected) throw new Error(`Missing case: ${id}`);
      const source = runtime.BCRS_IMAGE_SOURCES.find((row) => row.id === expected.sourceId);
      const raw = fs.readFileSync(path.join(app, 'scripts/phase0/fixtures/cache', source.filename));
      if (sha(raw) !== source.sha256) throw new Error(`Source hash mismatch: ${id}`);
      const framed = source.crop ? await sharp(raw).extract(source.crop).toBuffer() : raw;
      const client = await sharp(framed).rotate()
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).jpeg({ quality: 70 }).toBuffer();
      const bytes = Buffer.from(await runtime.validateAndSanitizeImage(client.toString('base64')), 'base64');
      const old = previous.rows.find((row) => row.id === source.id);
      if (!old || !old.submittedHashMatches) throw new Error(`Missing prior pipeline audit: ${id}`);
      const filename = `${source.id}.jpg`;
      fs.writeFileSync(path.join(output, filename), bytes);
      cases.push({ ...expected, partition: 'exposed-development-only', filename,
        sourceSha256: source.sha256, submittedSha256: sha(bytes), sourcePageUrl: source.sourcePageUrl,
        submittedBytes: bytes.length });
    }
    // Compare reconstructed inputs directly with prior request hashes, without reading image captions.
    const priorRequests = JSON.parse(fs.readFileSync(path.join(app,
      'scripts/phase0/results/action-bcrs-20260919-raw.json'), 'utf8'));
    for (const test of cases) {
      if (!priorRequests.some((record) => record.request.messages.some((message) =>
        Array.isArray(message.content) && message.content.some((part) =>
          part.type === 'image_url' && part.image_url.url === `sha256:${test.submittedSha256}`)))) {
        throw new Error(`Input differs from prior submitted bytes: ${test.id}`);
      }
    }
    const plan = { id: 'image-routes-20260920-models', frozenAt: new Date().toISOString(), revision,
      purpose: 'Development screening, not a complete release gate or a new holdout',
      models: ['kimi-k2.6', 'minimax-m3', 'deepseek/deepseek-flash'], repetitions: 3,
      logicalCalls: cases.length * 3 * 3, maxInFlight: 3,
      parameters: { temperature: 0.6, max_tokens: 1024, thinking: { type: 'disabled' },
        response_format: 'existing action json_schema strict' },
      executionPolicy: runtime.DEFAULT_EXECUTION_POLICY,
      stopRules: ['Stop a model after a permanent HTTP 400/401/402/403/404/422 response.',
        'No prompt, threshold, format or budget changes during this plan.',
        'Keep every completed trial, including failed attempts; never repeat to select a passing run.'],
      limitations: ['All images are exposed development cases, English only.',
        'No actual soft-pouch control in the existing image suite; cannot assess its recognition recall.',
        'Kimi control is the unpublished action candidate, not a fresh measurement of production.'],
      runtimeSha256: sha(fs.readFileSync(runtimeFile)),
      harnessSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), cases };
    fs.writeFileSync(planFile, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ frozen: plan.id, cases: cases.length, logicalCalls: plan.logicalCalls,
      planSha256: sha(fs.readFileSync(planFile)), reconstructedInputsMatchPriorRequests: true }, null, 2));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

function checkPlan() {
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  if (sha(fs.readFileSync(runtimeFile)) !== plan.runtimeSha256) throw new Error('Runtime changed.');
  if (sha(fs.readFileSync(fileURLToPath(import.meta.url))) !== plan.harnessSha256) throw new Error('Harness changed.');
  for (const test of plan.cases) {
    if (sha(fs.readFileSync(path.join(output, test.filename))) !== test.submittedSha256) {
      throw new Error(`Frozen input changed: ${test.id}`);
    }
  }
  return plan;
}

function score(expected, actual) {
  const failures = [];
  if (actual.channel !== expected.channel) failures.push('channel');
  if (actual.status !== expected.status) failures.push('status');
  if (expected.maxConfidence !== undefined && actual.confidence > expected.maxConfidence) failures.push('confidence');
  if (expected.nextAction !== undefined && (actual.next_action?.type ?? null) !== expected.nextAction) failures.push('next_action');
  const text = JSON.stringify(actual);
  for (const required of expected.requiredExactText ?? []) if (!text.includes(required)) failures.push(`missing:${required}`);
  if (actual.status === 'not_sure' && /blue_bin|blue bin/i.test(text)) failures.push('not_sure_blue_bin');
  return { pass: failures.length === 0, failures,
    wrongChannel: actual.channel !== null && actual.channel !== expected.channel,
    falseReturn: actual.channel === 'return_point' && expected.channel !== 'return_point' };
}

async function run() {
  const plan = checkPlan();
  const rowsFile = path.join(output, 'trials.jsonl');
  const traceFile = path.join(output, 'requests.jsonl');
  if (fs.existsSync(rowsFile) || fs.existsSync(traceFile)) throw new Error('Run already started; do not overwrite or silently repeat.');
  dotenv.config({ path: path.join(app, '.env'), quiet: true });
  if (!process.env.TOKENHUB_API_KEY) throw new Error('TOKENHUB_API_KEY is missing.');
  const runtime = require(runtimeFile);
  const context = new AsyncLocalStorage();
  const originalFetch = globalThis.fetch;
  const trials = [];
  const traces = [];
  const stopped = [];
  const startedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'start.json'), JSON.stringify({ startedAt,
    planSha256: sha(fs.readFileSync(planFile)) }, null, 2) + '\n', { flag: 'wx' });
  globalThis.fetch = async (input, init) => {
    if (String(input) !== endpoint) throw new Error('Experiment attempted an unexpected endpoint.');
    const ctx = context.getStore();
    if (!ctx) throw new Error('Missing trial context.');
    const request = JSON.parse(String(init.body));
    const requestSha256 = sha(String(init.body));
    for (const message of request.messages) if (Array.isArray(message.content)) {
      for (const part of message.content) if (part.type === 'image_url') {
        part.image_url.url = `sha256:${sha(Buffer.from(part.image_url.url.split(',')[1], 'base64'))}`;
      }
    }
    const record = { model: ctx.model, id: ctx.id, repetition: ctx.repetition,
      startedAt: new Date().toISOString(), requestSha256, request };
    const start = Date.now();
    try {
      const response = await originalFetch(input, init);
      record.httpStatus = response.status;
      record.responseText = await response.clone().text();
      return response;
    } catch (error) {
      record.error = String(error);
      throw error;
    } finally {
      record.latencyMs = Date.now() - start;
      ctx.attempts.push(record);
      traces.push(record);
      fs.appendFileSync(traceFile, JSON.stringify(record) + '\n');
    }
  };
  try {
    await Promise.all(plan.models.map(async (model, modelIndex) => {
      const provider = new runtime.TokenHubProvider(undefined, { visionModel: model });
      for (let repetition = 1; repetition <= plan.repetitions; repetition++) {
        // Rotate starting cases per lane and repetition to avoid a fixed warm-up/order advantage.
        const shift = (modelIndex * 4 + repetition - 1) % plan.cases.length;
        const order = [...plan.cases.slice(shift), ...plan.cases.slice(0, shift)];
        for (const test of order) {
          const ctx = { model, id: test.id, repetition, attempts: [] };
          const start = Date.now();
          const result = { model, id: test.id, repetition };
          await context.run(ctx, async () => {
            try {
              const actual = await runtime.classifyItem({ locale: test.locale,
                image: fs.readFileSync(path.join(output, test.filename)).toString('base64') }, provider,
              plan.executionPolicy);
              Object.assign(result, { actual, ...score(test, actual) });
            } catch (error) { Object.assign(result, { pass: false, error: String(error) }); }
          });
          result.latencyMs = Date.now() - start;
          result.attempts = ctx.attempts.length;
          trials.push(result);
          fs.appendFileSync(rowsFile, JSON.stringify(result) + '\n');
          console.log(JSON.stringify({ model, id: test.id, repetition, pass: result.pass,
            channel: result.actual?.channel, action: result.actual?.next_action?.type,
            error: result.error, attempts: result.attempts, ms: result.latencyMs }));
          const permanent = ctx.attempts.find((a) => [400, 401, 402, 403, 404, 422].includes(a.httpStatus));
          if (permanent) { stopped.push({ model, id: test.id, httpStatus: permanent.httpStatus,
            reason: permanent.responseText }); return; }
        }
      }
    }));
  } finally { globalThis.fetch = originalFetch; }
  const percentile = (numbers, p) => numbers.length
    ? [...numbers].sort((a, b) => a - b)[Math.ceil(numbers.length * p) - 1] : null;
  const summary = { startedAt, completedAt: new Date().toISOString(), planSha256: sha(fs.readFileSync(planFile)),
    releaseEvidence: false, stopped, models: plan.models.map((model) => {
      const rows = trials.filter((r) => r.model === model);
      const calls = traces.filter((r) => r.model === model);
      const responses = calls.flatMap((r) => { try { return [JSON.parse(r.responseText)]; } catch { return []; } });
      const positive = rows.filter((r) => plan.cases.find((c) => c.id === r.id).channel === 'return_point');
      return { model, trials: rows.length, planned: plan.cases.length * plan.repetitions,
        passed: rows.filter((r) => r.pass).length, finalErrors: rows.filter((r) => r.error).length,
        wrongChannels: rows.filter((r) => r.wrongChannel).length,
        falseReturns: rows.filter((r) => r.falseReturn).length,
        positiveHits: positive.filter((r) => r.actual?.channel === 'return_point').length,
        positiveTrials: positive.length, actualRequests: calls.length,
        latencyAllP50Ms: percentile(rows.map((r) => r.latencyMs), .5),
        latencyAllP95Ms: percentile(rows.map((r) => r.latencyMs), .95),
        inputTokens: responses.reduce((n, r) => n + (r.usage?.prompt_tokens ?? 0), 0),
        outputTokens: responses.reduce((n, r) => n + (r.usage?.completion_tokens ?? 0), 0),
        reasoningTokens: responses.reduce((n, r) => n + (r.usage?.completion_tokens_details?.reasoning_tokens ?? 0), 0),
        responsesWithUsage: responses.filter((r) => r.usage).length,
        cases: plan.cases.map((c) => ({ id: c.id, outcomes: rows.filter((r) => r.id === c.id)
          .map((r) => ({ repetition: r.repetition, pass: r.pass, channel: r.actual?.channel,
            action: r.actual?.next_action?.type, error: r.error, failures: r.failures })) })) };
    }) };
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary.models.map((totals) => ({ ...totals, cases: undefined })), null, 2));
}

const mode = process.argv[2];
if (mode === 'prepare') await prepare();
else if (mode === 'check') console.log(JSON.stringify({ valid: true, id: checkPlan().id }));
else if (mode === 'run') await run();
else throw new Error('Use prepare, check or run.');
