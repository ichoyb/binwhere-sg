// Offline research path: one visual facts call, then a small beverage-only decision function.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../..');
const output = path.join(app, 'scripts/phase0/results/image-routes-20260920');
const runtimeFile = path.join(output, 'runtime.cjs');
const runtime = createRequire(import.meta.url)(runtimeFile);
const sha = (x) => createHash('sha256').update(x).digest('hex');
const planFile = path.join(here, 'facts-plan.json');
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

const system = `Extract visual observations from one photograph. Do not recommend a recycling channel, an action, or a refund. Describe the physical container shown rather than a package usually associated with its brand. Do not use external information or assume missing surfaces are visible.
One intended foreground container counts as a single subject; several equally plausible containers count as multiple. Distinguish glass, plastic, metal, paper and composite packaging using visible physical features. Use unknown/null when the image cannot establish a fact. visible_damage is observed crushing, serious container damage, or damage to a visible product barcode. visible_soiling is visible dirt, grease or non-beverage contamination; ordinary beverage contents are not soiling and can be emptied.
For a possible deposit mark, transcribe only distinguishable characters, preserving question marks for unreadable characters. Do not complete a familiar logo from its shape, or turn a 10-cent amount into SG/RETURN. Mark text and graphics printed on a poster, a machine, outer packaging or separate artwork do not belong to the subject container. A linear product barcode is separate from a square 2D code. Report a foreign deposit mark only if its text or symbol visibly identifies another deposit scheme.
Return only a JSON object with these exact fields and values:
{"item":"brief English object name","subject":"single_container|multiple_containers|no_container|unclear","form":"bottle|can|cup|carton|pouch|other|unknown","material":"plastic|metal|glass|paper|composite|other|unknown","prepackaged_beverage":true,"volume_ml":null,"visible_damage":false,"visible_soiling":false,"return_arrow_graphic_visible":false,"deposit_mark_text":"literal readable text, or empty string","mark_on_subject_container":false,"foreign_deposit_mark":false,"linear_barcode_on_subject":false}
prepackaged_beverage is true, false or null; volume_ml is a visible numeric volume or null. All other booleans describe visible evidence, not assumptions.`;

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

if (process.argv[2] === 'prepare') {
  const base = JSON.parse(fs.readFileSync(path.join(here, 'json-plan.json'), 'utf8'));
  const plan = { ...base, id: 'image-routes-20260920-facts', frozenAt: new Date().toISOString(),
    purpose: 'Compare a facts-only prompt plus beverage decision code against the earlier combined classification task.',
    system, factsSchema: z.toJSONSchema(Facts),
    limitations: [...base.limitations, 'Not an independent mark verifier; facts are still probabilistic model outputs.',
      'Research-only beverage decision function; not a full classifier or a deployable implementation.',
      'Confidence values are diagnostic constants, not calibrated probabilities.'],
    harnessSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))) };
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ id: plan.id, calls: plan.logicalCalls, sha256: sha(fs.readFileSync(planFile)) }));
} else if (process.argv[2] === 'run') {
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  if (sha(fs.readFileSync(runtimeFile)) !== plan.runtimeSha256 ||
    sha(fs.readFileSync(fileURLToPath(import.meta.url))) !== plan.harnessSha256) throw new Error('Code changed.');
  for (const c of plan.cases) if (sha(fs.readFileSync(path.join(output, c.filename))) !== c.submittedSha256) throw new Error('Image changed.');
  const trialsFile = path.join(output, 'facts-trials.jsonl');
  const requestsFile = path.join(output, 'facts-requests.jsonl');
  if (fs.existsSync(trialsFile) || fs.existsSync(requestsFile)) throw new Error('Do not repeat an existing run.');
  fs.writeFileSync(path.join(output, 'facts-start.json'), JSON.stringify({ startedAt: new Date().toISOString(),
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
        const provider = { name: 'facts-research', classify: async (_request, signal) => {
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
          const failures = [];
          if (actual.channel !== c.channel) failures.push('channel');
          if (actual.status !== c.status) failures.push('status');
          if (c.nextAction !== undefined && (actual.next_action?.type ?? null) !== c.nextAction) failures.push('next_action');
          if (c.maxConfidence !== undefined && actual.confidence > c.maxConfidence) failures.push('confidence');
          for (const required of c.requiredExactText ?? []) if (!JSON.stringify(actual).includes(required)) failures.push('required_text');
          if (actual.status === 'not_sure' && /blue_bin|blue bin/i.test(JSON.stringify(actual))) failures.push('not_sure_blue_bin');
          Object.assign(trial, { actual, failures, pass: failures.length === 0,
            wrongChannel: actual.channel !== null && actual.channel !== c.channel,
            falseReturn: actual.channel === 'return_point' && c.channel !== 'return_point' });
        } catch (error) { Object.assign(trial, { pass: false, error: String(error) }); }
        trial.latencyMs = Date.now() - start;
        const permanent = trial.attempts.find((r) => [400, 401, 402, 403, 404, 422].includes(r.httpStatus));
        const count = trial.attempts.length;
        trial.attempts = count;
        trials.push(trial); fs.appendFileSync(trialsFile, JSON.stringify(trial) + '\n');
        console.log(JSON.stringify({ model, id: c.id, repetition, pass: trial.pass,
          channel: trial.actual?.channel, action: trial.actual?.next_action?.type, ms: trial.latencyMs, error: trial.error }));
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
        finalErrors: rows.filter((r) => r.error).length, wrongChannels: rows.filter((r) => r.wrongChannel).length,
        falseReturns: rows.filter((r) => r.falseReturn).length, positiveHits: positive.filter((r) => r.actual?.channel === 'return_point').length,
        positiveTrials: positive.length, actualRequests: calls.length,
        latencyAllP50Ms: percentile(rows.map((r) => r.latencyMs), .5), latencyAllP95Ms: percentile(rows.map((r) => r.latencyMs), .95),
        inputTokens: responses.reduce((n, r) => n + (r.usage?.prompt_tokens ?? 0), 0),
        outputTokens: responses.reduce((n, r) => n + (r.usage?.completion_tokens ?? 0), 0),
        reasoningTokens: responses.reduce((n, r) => n + (r.usage?.completion_tokens_details?.reasoning_tokens ?? 0), 0),
        responsesWithUsage: responses.filter((r) => r.usage).length };
    }) };
  fs.writeFileSync(path.join(output, 'facts-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
} else throw new Error('Use prepare or run.');
