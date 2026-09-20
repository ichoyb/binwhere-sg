// Separate fixed-plan format experiment; no production changes or automatic fallback.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../..');
const output = path.join(app, 'scripts/phase0/results/image-routes-20260920');
const planFile = path.join(here, 'json-plan.json');
const endpoint = 'https://tokenhub.tencentmaas.com/v1/chat/completions';
const sha = (x) => createHash('sha256').update(x).digest('hex');
const runtimeFile = path.join(output, 'runtime.cjs');
const runtime = createRequire(import.meta.url)(runtimeFile);

if (process.argv[2] === 'prepare') {
  const original = JSON.parse(fs.readFileSync(path.join(here, 'plan.json'), 'utf8'));
  const plan = { ...original, id: 'image-routes-20260920-json-object', frozenAt: new Date().toISOString(),
    models: ['kimi-k2.6', 'deepseek/deepseek-flash'], repetitions: 2, logicalCalls: 48, maxInFlight: 2,
    parameters: { ...original.parameters, response_format: 'json_object' },
    purpose: 'Separate supported-format comparison; identical prompts, images and local schema validation',
    harnessSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))) };
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ id: plan.id, logicalCalls: plan.logicalCalls, sha256: sha(fs.readFileSync(planFile)) }));
} else if (process.argv[2] === 'run') {
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  if (sha(fs.readFileSync(runtimeFile)) !== plan.runtimeSha256 ||
    sha(fs.readFileSync(fileURLToPath(import.meta.url))) !== plan.harnessSha256) throw new Error('Code changed.');
  for (const c of plan.cases) if (sha(fs.readFileSync(path.join(output, c.filename))) !== c.submittedSha256) throw new Error('Image changed.');
  const trialsFile = path.join(output, 'json-trials.jsonl');
  const requestsFile = path.join(output, 'json-requests.jsonl');
  if (fs.existsSync(trialsFile) || fs.existsSync(requestsFile)) throw new Error('Do not repeat an existing run.');
  fs.writeFileSync(path.join(output, 'json-start.json'), JSON.stringify({ startedAt: new Date().toISOString(),
    planSha256: sha(fs.readFileSync(planFile)) }) + '\n', { flag: 'wx' });
  dotenv.config({ path: path.join(app, '.env'), quiet: true });
  const context = new AsyncLocalStorage();
  const originalFetch = globalThis.fetch;
  const trials = [];
  const requests = [];
  const stopped = [];
  globalThis.fetch = async (input, init) => {
    if (String(input) !== endpoint) throw new Error('Unexpected endpoint.');
    const ctx = context.getStore();
    const request = JSON.parse(String(init.body));
    const record = { model: ctx.model, id: ctx.id, repetition: ctx.repetition,
      startedAt: new Date().toISOString(), requestSha256: sha(String(init.body)), request };
    if (request.response_format.type !== 'json_object') throw new Error('Wrong format.');
    for (const m of request.messages) if (Array.isArray(m.content)) for (const part of m.content) {
      if (part.type === 'image_url') part.image_url.url = 'sha256:' + sha(Buffer.from(part.image_url.url.split(',')[1], 'base64'));
    }
    const start = Date.now();
    try {
      const response = await originalFetch(input, init);
      record.httpStatus = response.status;
      record.responseText = await response.clone().text();
      return response;
    } catch (error) { record.error = String(error); throw error; }
    finally {
      record.latencyMs = Date.now() - start;
      ctx.attempts.push(record); requests.push(record);
      fs.appendFileSync(requestsFile, JSON.stringify(record) + '\n');
    }
  };
  try {
    await Promise.all(plan.models.map(async (model, index) => {
      const provider = new runtime.TokenHubProvider(undefined, { visionModel: model, strictResponseSchema: false });
      for (let repetition = 1; repetition <= plan.repetitions; repetition++) {
        const shift = (index * 4 + repetition - 1) % plan.cases.length;
        const order = [...plan.cases.slice(shift), ...plan.cases.slice(0, shift)];
        for (const c of order) {
          const ctx = { model, id: c.id, repetition, attempts: [] };
          const trial = { model, id: c.id, repetition };
          const start = Date.now();
          await context.run(ctx, async () => {
            try {
              const actual = await runtime.classifyItem({ locale: c.locale,
                image: fs.readFileSync(path.join(output, c.filename)).toString('base64') }, provider, plan.executionPolicy);
              const failures = [];
              if (actual.channel !== c.channel) failures.push('channel');
              if (actual.status !== c.status) failures.push('status');
              if (c.maxConfidence !== undefined && actual.confidence > c.maxConfidence) failures.push('confidence');
              if (c.nextAction !== undefined && (actual.next_action?.type ?? null) !== c.nextAction) failures.push('next_action');
              for (const text of c.requiredExactText ?? []) if (!JSON.stringify(actual).includes(text)) failures.push('required_text');
              if (actual.status === 'not_sure' && /blue_bin|blue bin/i.test(JSON.stringify(actual))) failures.push('not_sure_blue_bin');
              Object.assign(trial, { actual, failures, pass: failures.length === 0,
                wrongChannel: actual.channel !== null && actual.channel !== c.channel,
                falseReturn: actual.channel === 'return_point' && c.channel !== 'return_point' });
            } catch (error) { Object.assign(trial, { pass: false, error: String(error) }); }
          });
          trial.latencyMs = Date.now() - start; trial.attempts = ctx.attempts.length;
          trials.push(trial); fs.appendFileSync(trialsFile, JSON.stringify(trial) + '\n');
          console.log(JSON.stringify({ ...trial, actual: trial.actual && {
            item: trial.actual.item, channel: trial.actual.channel, action: trial.actual.next_action?.type } }));
          const permanent = ctx.attempts.find((a) => [400, 401, 402, 403, 404, 422].includes(a.httpStatus));
          if (permanent) { stopped.push({ model, httpStatus: permanent.httpStatus, reason: permanent.responseText }); return; }
        }
      }
    }));
  } finally { globalThis.fetch = originalFetch; }
  const percentile = (values, p) => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] : null;
  const summary = { completedAt: new Date().toISOString(), releaseEvidence: false, stopped,
    planSha256: sha(fs.readFileSync(planFile)), models: plan.models.map((model) => {
      const rows = trials.filter((r) => r.model === model);
      const calls = requests.filter((r) => r.model === model);
      const responses = calls.flatMap((r) => { try { return [JSON.parse(r.responseText)]; } catch { return []; } });
      const positive = rows.filter((r) => plan.cases.find((c) => c.id === r.id).channel === 'return_point');
      return { model, trials: rows.length, passed: rows.filter((r) => r.pass).length,
        finalErrors: rows.filter((r) => r.error).length, wrongChannels: rows.filter((r) => r.wrongChannel).length,
        falseReturns: rows.filter((r) => r.falseReturn).length, positiveHits: positive.filter((r) => r.actual?.channel === 'return_point').length,
        positiveTrials: positive.length, actualRequests: calls.length,
        latencyAllP50Ms: percentile(rows.map((r) => r.latencyMs), .5), latencyAllP95Ms: percentile(rows.map((r) => r.latencyMs), .95),
        inputTokens: responses.reduce((n, r) => n + (r.usage?.prompt_tokens ?? 0), 0),
        outputTokens: responses.reduce((n, r) => n + (r.usage?.completion_tokens ?? 0), 0),
        reasoningTokens: responses.reduce((n, r) => n + (r.usage?.completion_tokens_details?.reasoning_tokens ?? 0), 0),
        responsesWithUsage: responses.filter((r) => r.usage).length };
    }) };
  fs.writeFileSync(path.join(output, 'json-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
} else throw new Error('Use prepare or run.');
