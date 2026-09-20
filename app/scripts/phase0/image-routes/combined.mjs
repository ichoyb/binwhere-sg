// Offline research path: one visual facts call, then a small beverage-only decision function.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import dotenv from 'dotenv';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../..');
const parentOutput = path.join(app, 'scripts/phase0/results/image-routes-20260920');
const output = path.join(parentOutput, 'combined');
const runtimeFile = path.join(parentOutput, 'runtime.cjs');
const runtime = createRequire(import.meta.url)(runtimeFile);
const sha = (x) => createHash('sha256').update(x).digest('hex');
const planFile = path.join(here, 'combined-plan.json');
const Facts = z.object({
  item: z.string().min(1),
  subject: z.enum(['single_container', 'multiple_containers', 'no_container', 'unclear']),
  form: z.enum(['bottle', 'can', 'cup', 'carton', 'pouch', 'other', 'unknown']),
  material: z.enum(['plastic', 'metal', 'glass', 'paper', 'composite', 'other', 'unknown']),
  prepackaged_beverage: z.boolean().nullable(),
  volume_ml: z.number().positive().nullable(),
  visible_damage: z.boolean(),
  visible_soiling: z.boolean(),
  return_arrow_graphic_visible: z.boolean(),
  deposit_mark_text: z.string(),
  mark_on_subject_container: z.boolean(),
  foreign_deposit_mark: z.boolean(),
  linear_barcode_on_subject: z.boolean(),
}).strict();

const system = JSON.parse(fs.readFileSync(path.join(here, 'jurisdiction-plan.json'), 'utf8')).system;

function decide(facts) {
  const result = { item: facts.item, status: 'not_sure', channel: null, confidence: 0.4,
    reason: 'The photograph does not establish a confirmed recycling channel.', preparation: [], tip: '' };
  if (facts.subject !== 'single_container' || facts.prepackaged_beverage !== true) return result;
  if (facts.material === 'glass' && facts.form === 'bottle' && !facts.visible_soiling) {
    return { ...result, status: 'recyclable', channel: 'blue_bin', confidence: 0.8,
      reason: 'Glass beverage bottles can be recycled after emptying and rinsing.',
      preparation: ['Empty, rinse and dry the bottle.'] };
  }
  const inScope = ['plastic', 'metal'].includes(facts.material) && ['bottle', 'can', 'cup'].includes(facts.form)
    && (facts.volume_ml === null || (facts.volume_ml >= 150 && facts.volume_ml <= 3000));
  if (!inScope || facts.visible_damage || facts.visible_soiling || facts.foreign_deposit_mark) return result;
  const mark = facts.deposit_mark_text.toUpperCase();
  const confirmed = facts.return_arrow_graphic_visible && facts.mark_on_subject_container
    && /\bSG\b/.test(mark) && /\bRETURN\b/.test(mark) && /10\s*(?:¢|CENTS?)/.test(mark)
    && facts.linear_barcode_on_subject;
  const type = confirmed ? 'return_container' : 'try_return_point';
  return { ...result, ...(confirmed ? { status: 'recyclable', channel: 'return_point', confidence: 0.8,
    reason: 'The observed container mark and barcode support returning it for S$0.10, subject to the machine scan.' } : {}),
  next_action: { type, channel: 'return_point', title: confirmed ? 'Return the container' : 'Try a Return Point',
    instruction: 'Empty the container and keep it intact.', qualification: confirmed
      ? 'The Return Point makes the final acceptance decision.' : 'Eligibility is unconfirmed; try scanning next time you pass a Return Point.' } };
}

function evaluate(c, actual, facts) {
  const behaviorFailures = [];
  if (c.channel !== undefined && actual.channel !== c.channel) behaviorFailures.push('channel');
  if (c.status !== undefined && actual.status !== c.status) behaviorFailures.push('status');
  if ((actual.next_action?.type ?? null) !== c.nextAction) behaviorFailures.push('next_action');
  if (c.maxConfidence !== undefined && actual.confidence > c.maxConfidence) behaviorFailures.push('confidence');
  for (const required of c.requiredExactText ?? []) if (!JSON.stringify(actual).includes(required)) behaviorFailures.push('required_text');
  if (actual.status === 'not_sure' && /blue_bin|blue bin/i.test(JSON.stringify(actual))) behaviorFailures.push('not_sure_blue_bin');
  if (c.kind === 'perception_and_bcrs_exclusion' && actual.channel === 'return_point') behaviorFailures.push('excluded_return');
  const perceptionFailures = Object.entries(c.expectedFacts ?? {})
    .filter(([key, value]) => facts?.[key] !== value).map(([key]) => key);
  return { behaviorFailures, perceptionFailures, failures: [...behaviorFailures, ...perceptionFailures.map((x) => 'facts.' + x)],
    behaviorPass: behaviorFailures.length === 0, perceptionPass: perceptionFailures.length === 0,
    pass: behaviorFailures.length === 0 && perceptionFailures.length === 0,
    wrongChannel: c.channel !== undefined && actual.channel !== null && actual.channel !== c.channel,
    falseReturn: (actual.channel === 'return_point' || actual.next_action?.type === 'return_container') && c.channel !== 'return_point' };
}

if (process.argv[2] === 'prepare') {
  const base = JSON.parse(fs.readFileSync(path.join(here, 'facts-plan.json'), 'utf8'));
  if (sha(fs.readFileSync(path.join(here, 'facts.mjs'))) !== base.harnessSha256) throw new Error('Frozen source changed.');
  if (fs.existsSync(planFile)) throw new Error('Plan already frozen.');
  const sources = [
    { id: 'control-full-can', filename: 'coca-cola-life-full-can.jpg',
      sha256: 'a86ad7d57bf0ec026021d7c329046a78ab57edd469130150a7ed3a7e573382de',
      page: 'https://commons.wikimedia.org/wiki/File:Can_of_Coca_Cola_Life.jpg',
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Can_of_Coca_Cola_Life.jpg',
      author: 'Vincedevries', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      kind: 'behavior_and_perception', channel: null, status: 'not_sure', maxConfidence: .49,
      nextAction: 'try_return_point', expectedFacts: { subject: 'single_container', form: 'can', material: 'metal', prepackaged_beverage: true },
      rationale: 'Full rim and bottom visible, 330 ml beverage can; visible face establishes no deposit eligibility.' },
    { id: 'control-real-pouch', filename: 'capri-sun-pouch.jpg',
      sha256: 'de6b74cf64c4ded11a9457065e070408a28ee147f2186ed3356909e3a75b5cce',
      page: 'https://commons.wikimedia.org/wiki/File:Capri_Sun_pouch_standing.jpg',
      url: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Capri_Sun_pouch_standing.jpg',
      author: 'Tamzin Hadasa Kelly', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      kind: 'perception_and_bcrs_exclusion', nextAction: null,
      expectedFacts: { subject: 'single_container', form: 'pouch', material: 'composite' },
      rationale: 'Actual flexible laminated drink pouch with seams and straw. This control tests form/material and exclusion from BCRS actions, not its final disposal channel.' },
  ];
  const cases = [];
  for (const test of [...base.cases, ...sources.map((c) => ({ ...c, sourceId: c.id, locale: 'en',
    partition: 'new-developer-selected-control-not-blind' }))]) {
    const added = sources.find((c) => c.id === test.id);
    const source = added ?? runtime.BCRS_IMAGE_SOURCES.find((c) => c.id === test.sourceId);
    const raw = fs.readFileSync(added ? path.join(output, 'sources', source.filename)
      : path.join(app, 'scripts/phase0/fixtures/cache', source.filename));
    if (sha(raw) !== source.sha256) throw new Error('Source changed: ' + source.id);
    const framed = source.crop ? await sharp(raw).extract(source.crop).toBuffer() : raw;
    const transform = (buffer) => sharp(buffer).rotate().resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }).jpeg({ quality: 70 }).toBuffer();
    const client = await transform(framed);
    const bytes = await transform(client);
    const meta = await sharp(bytes).metadata();
    if (bytes.length > 5 * 1024 * 1024 || Math.max(meta.width, meta.height) > 4096
      || meta.width * meta.height > 8_000_000) throw new Error('Upload limit exceeded.');
    const filename = `${source.id}.jpg`;
    fs.writeFileSync(path.join(output, filename), bytes, { flag: 'wx' });
    const c = { ...test, kind: test.kind ?? 'behavior_and_perception', filename,
      sourceSha256: sha(raw), submittedSha256: sha(bytes), submittedBytes: bytes.length,
      width: meta.width, height: meta.height, sourcePageUrl: added?.page ?? test.sourcePageUrl,
      baselineFilename: added ? null : test.filename,
      identicalTo1024Baseline: added ? null : sha(bytes) === test.submittedSha256 };
    if (c.channel === 'return_point') c.nextAction = 'return_container';
    if (['holdout-singapore-mark-closeup-en', 'holdout-single-angle-malaysia-can-v7-en',
      'holdout-standalone-mark-product-composite-v15-en'].includes(c.id)) c.nextAction = 'try_return_point';
    if (c.nextAction === undefined) throw new Error('Every case must assert an action.');
    if (c.id === 'holdout-single-angle-malaysia-can-v7-en') c.expectedFacts = {
      subject: 'single_container', form: 'can', material: 'metal', prepackaged_beverage: true };
    if (c.id === 'holdout-singapore-mark-closeup-en') c.expectedFacts = {
      subject: 'single_container', form: 'bottle', material: 'plastic', prepackaged_beverage: true };
    if (c.channel === 'blue_bin') c.expectedFacts = { subject: 'single_container', form: 'bottle', material: 'glass' };
    cases.push(c);
  }
  const plan = { ...base, id: 'image-routes-20260920-combined', frozenAt: new Date().toISOString(),
    purpose: 'Test the complete frozen candidate: facts-only + Singapore-relative mark definition + unchanged beverage decision code + 2048/Q70 input.',
    system, factsSchema: z.toJSONSchema(Facts), cases, repetitions: 3, logicalCalls: cases.length * base.models.length * 3,
    clientAndApiInput: { longestEdge: 2048, jpegQuality: 70, enlarge: false, steps: 2 },
    sourceHarnessSha256: base.harnessSha256,
    sourceJurisdictionPlanSha256: sha(fs.readFileSync(path.join(here, 'jurisdiction-plan.json'))),
    decisionSha256: sha(decide.toString()), harnessSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
    screening: 'Any unmet required action, false refund, wrong channel, final error, or can/pouch perception assertion means this candidate is not ready for full release evaluation. Existing release thresholds are unchanged.',
    limitations: ['English-only development screening, not full release evidence.',
      '12 previously exposed images plus 2 developer-selected controls; repeated calls are not independent image samples.',
      'New can and pouch are different objects, not paired views of the failing v7 object.',
      'Pouch control validates perception and BCRS exclusion only; no claim to have implemented its final disposal action.',
      'Facts remain probabilistic model outputs; deterministic rule execution does not establish visual truth.',
      'Research-only beverage subset, fixed diagnostic confidences, not a complete deployable classifier.',
      'The 2048 JPEG simulation is not a browser/native end-to-end measurement.'] };
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ id: plan.id, calls: plan.logicalCalls, sha256: sha(fs.readFileSync(planFile)) }));
} else if (process.argv[2] === 'run') {
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  if (sha(fs.readFileSync(runtimeFile)) !== plan.runtimeSha256 ||
    sha(fs.readFileSync(fileURLToPath(import.meta.url))) !== plan.harnessSha256) throw new Error('Code changed.');
  for (const c of plan.cases) if (sha(fs.readFileSync(path.join(output, c.filename))) !== c.submittedSha256) throw new Error('Image changed.');
  const trialsFile = path.join(output, 'combined-trials.jsonl');
  const requestsFile = path.join(output, 'combined-requests.jsonl');
  if (fs.existsSync(trialsFile) || fs.existsSync(requestsFile)) throw new Error('Do not repeat an existing run.');
  fs.writeFileSync(path.join(output, 'combined-start.json'), JSON.stringify({ startedAt: new Date().toISOString(),
    planSha256: sha(fs.readFileSync(planFile)) }) + '\n', { flag: 'wx' });
  dotenv.config({ path: path.join(app, '.env'), quiet: true });
  if (!process.env.TOKENHUB_API_KEY) throw new Error('Missing API key.');
  const trials = [];
  const stopped = [];
  await Promise.all(plan.models.map(async (model, index) => {
    for (let repetition = 1; repetition <= plan.repetitions; repetition++) {
      const shift = (index * 4 + repetition - 1) % plan.cases.length;
      for (const c of [...plan.cases.slice(shift), ...plan.cases.slice(0, shift)]) {
        const trial = { model, id: c.id, repetition, attempts: [] };
        const provider = { name: 'combined-research', classify: async (_request, signal) => {
          const request = { model, temperature: .6, max_tokens: 1024, thinking: { type: 'disabled' },
            response_format: { type: 'json_object' }, messages: [{ role: 'system', content: plan.system },
              { role: 'user', content: [{ type: 'image_url', image_url: {
                url: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(output, c.filename)).toString('base64') } },
              { type: 'text', text: 'Extract the visible facts from this photograph.' }] }] };
          const body = JSON.stringify(request);
          request.messages[1].content[0].image_url.url = 'sha256:' + c.submittedSha256;
          const record = { model, id: c.id, repetition, startedAt: new Date().toISOString(),
            requestSha256: sha(body), request };
          const start = Date.now();
          let response;
          try {
            response = await fetch('https://tokenhub.tencentmaas.com/v1/chat/completions', {
              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.TOKENHUB_API_KEY },
              body, signal });
            record.httpStatus = response.status; record.responseText = await response.text();
          } catch (error) {
            record.error = String(error); throw new runtime.RetryableProviderError(String(error));
          } finally {
            record.latencyMs = Date.now() - start;
            trial.attempts.push(record);
            fs.appendFileSync(requestsFile, JSON.stringify(record) + '\n');
          }
          if (!response.ok) {
            if (response.status >= 500 || response.status === 429) {
              const seconds = Number(response.headers.get('Retry-After'));
              throw new runtime.RetryableProviderError('HTTP ' + response.status,
                response.status === 504 ? 0 : response.status === 429 && Number.isFinite(seconds) ? seconds * 1000 : undefined);
            }
            throw new Error('HTTP ' + response.status);
          }
          try {
            const data = JSON.parse(record.responseText);
            const match = data.choices?.[0]?.message?.content?.match(/\{[\s\S]*\}/);
            const facts = Facts.parse(JSON.parse(match?.[0] ?? 'null'));
            record.facts = facts;
            trial.facts = facts;
            return decide(facts);
          } catch (error) { throw new runtime.RetryableProviderError('Invalid facts: ' + String(error)); }
        } };
        const start = Date.now();
        try {
          const actual = await runtime.classifyItem({ image: 'research-image-present', locale: 'en' }, provider, plan.executionPolicy);
          Object.assign(trial, { actual, ...evaluate(c, actual, trial.facts) });
        } catch (error) { Object.assign(trial, { pass: false, error: String(error) }); }
        trial.latencyMs = Date.now() - start;
        const permanent = trial.attempts.find((r) => [400, 401, 402, 403, 404, 422].includes(r.httpStatus));
        const count = trial.attempts.length;
        trial.attempts = count;
        trials.push(trial); fs.appendFileSync(trialsFile, JSON.stringify(trial) + '\n');
        console.log(JSON.stringify({ model, id: c.id, repetition, pass: trial.pass,
          channel: trial.actual?.channel, action: trial.actual?.next_action?.type, failures: trial.failures, form: trial.facts?.form, material: trial.facts?.material, ms: trial.latencyMs, error: trial.error }));
        if (permanent) { stopped.push({ model, status: permanent.httpStatus, reason: permanent.responseText }); return; }
      }
    }
  }));
  const requests = fs.readFileSync(requestsFile, 'utf8').trim().split('\n').map(JSON.parse);
  const percentile = (values, p) => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] : null;
  const summary = { completedAt: new Date().toISOString(), releaseEvidence: false, stopped,
    planSha256: sha(fs.readFileSync(planFile)), models: plan.models.map((model) => {
      const rows = trials.filter((r) => r.model === model);
      const calls = requests.filter((r) => r.model === model);
      const responses = calls.flatMap((r) => { try { return [JSON.parse(r.responseText)]; } catch { return []; } });
      const positive = rows.filter((r) => plan.cases.find((c) => c.id === r.id).channel === 'return_point');
      return { model, trials: rows.length, passed: rows.filter((r) => r.pass).length,
        behaviorPassed: rows.filter((r) => r.behaviorPass).length,
        perceptionTrials: rows.filter((r) => plan.cases.find((c) => c.id === r.id).expectedFacts).length,
        perceptionPassed: rows.filter((r) => plan.cases.find((c) => c.id === r.id).expectedFacts && r.perceptionPass).length,
        missingOrWrongActions: rows.filter((r) => r.behaviorFailures?.includes('next_action')).length,
        screeningPass: rows.length === plan.cases.length * plan.repetitions && rows.every((r) => r.pass),
        finalErrors: rows.filter((r) => r.error).length, wrongChannels: rows.filter((r) => r.wrongChannel).length,
        falseReturns: rows.filter((r) => r.falseReturn).length, positiveHits: positive.filter((r) => r.actual?.channel === 'return_point').length,
        positiveTrials: positive.length, actualRequests: calls.length,
        latencyAllP50Ms: percentile(rows.map((r) => r.latencyMs), .5), latencyAllP95Ms: percentile(rows.map((r) => r.latencyMs), .95),
        inputTokens: responses.reduce((n, r) => n + (r.usage?.prompt_tokens ?? 0), 0),
        outputTokens: responses.reduce((n, r) => n + (r.usage?.completion_tokens ?? 0), 0),
        reasoningTokens: responses.reduce((n, r) => n + (r.usage?.completion_tokens_details?.reasoning_tokens ?? 0), 0),
        responsesWithUsage: responses.filter((r) => r.usage).length };
    }) };
  fs.writeFileSync(path.join(output, 'combined-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
} else throw new Error('Use prepare or run.');
