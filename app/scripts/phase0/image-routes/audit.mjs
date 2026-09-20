// Recompute integrity and descriptive results from recorded calls; never contacts a provider.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, '../results/image-routes-20260920');
const sha = (x) => createHash('sha256').update(x).digest('hex');
const phases = [
  { name: 'strict', plan: 'plan.json', prefix: '', script: path.join(here, 'experiment.mjs') },
  { name: 'json', plan: 'json-plan.json', prefix: 'json-', script: path.join(here, 'json-mode.mjs') },
  { name: 'facts', plan: 'facts-plan.json', prefix: 'facts-', script: path.join(here, 'facts.mjs') },
  { name: 'quality', plan: 'quality-plan.json', prefix: 'quality-', script: path.join(output, 'quality-runner.mjs') },
  { name: 'jurisdiction', plan: 'jurisdiction-plan.json', prefix: 'jurisdiction-', script: path.join(output, 'jurisdiction-runner.mjs') },
  { name: 'combined', plan: 'combined-plan.json', prefix: 'combined-', directory: 'combined', script: path.join(here, 'combined.mjs') },
];
const reports = [];
for (const phase of phases) {
  const phaseOutput = path.join(output, phase.directory ?? '');
  const read = (name) => JSON.parse(fs.readFileSync(path.join(phaseOutput, name), 'utf8'));
  const lines = (name) => fs.readFileSync(path.join(phaseOutput, name), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  const planBytes = fs.readFileSync(path.join(here, phase.plan));
  const plan = JSON.parse(planBytes);
  const started = read(phase.prefix + 'start.json');
  const summary = read(phase.prefix + 'summary.json');
  const trials = lines(phase.prefix + 'trials.jsonl');
  const requests = lines(phase.prefix + 'requests.jsonl');
  assert.equal(started.planSha256, sha(planBytes));
  assert.equal(summary.planSha256, sha(planBytes));
  assert.equal(plan.harnessSha256, sha(fs.readFileSync(phase.script)));
  assert.equal(plan.runtimeSha256, sha(fs.readFileSync(path.join(output, 'runtime.cjs'))));
  assert.equal(new Set(trials.map((r) => `${r.model}/${r.id}/${r.repetition}`)).size, trials.length);
  assert(trials.length <= plan.logicalCalls);
  for (const request of requests) {
    const c = plan.cases.find((item) => item.id === request.id);
    assert(c && plan.models.includes(request.model));
    assert(request.repetition >= 1 && request.repetition <= plan.repetitions);
    assert.equal(request.request.model, request.model);
    assert.equal(request.request.max_tokens, plan.parameters.max_tokens);
    assert.equal(request.request.temperature, plan.parameters.temperature);
    assert.deepEqual(request.request.thinking, plan.parameters.thinking);
    assert(!('headers' in request));
    assert(!JSON.stringify(request).includes('data:image/'));
    const restored = structuredClone(request.request);
    const bytes = fs.readFileSync(path.join(phaseOutput, c.filename));
    assert.equal(sha(bytes), c.submittedSha256);
    for (const message of restored.messages) if (Array.isArray(message.content)) {
      for (const part of message.content) if (part.type === 'image_url') {
        assert.equal(part.image_url.url, 'sha256:' + c.submittedSha256);
        part.image_url.url = 'data:image/jpeg;base64,' + bytes.toString('base64');
      }
    }
    if (plan.system) assert.equal(restored.messages[0].content, plan.system);
    assert.equal(sha(JSON.stringify(restored)), request.requestSha256);
  }
  for (const trial of trials) {
    assert.equal(trial.attempts, requests.filter((r) => r.model === trial.model && r.id === trial.id
      && r.repetition === trial.repetition).length);
    assert(trial.attempts <= plan.executionPolicy.maxAttempts);
    if (phase.name === 'combined' && !trial.error) {
      const c = plan.cases.find((item) => item.id === trial.id);
      assert(Object.hasOwn(c, 'nextAction'));
      assert.equal(trial.behaviorFailures.includes('next_action'), (trial.actual.next_action?.type ?? null) !== c.nextAction);
      const expectedFailures = Object.entries(c.expectedFacts ?? {})
        .filter(([key, value]) => trial.facts[key] !== value).map(([key]) => key);
      assert.deepEqual(trial.perceptionFailures, expectedFailures);
      assert.equal(trial.perceptionPass, expectedFailures.length === 0);
      assert.equal(trial.behaviorPass, trial.behaviorFailures.length === 0);
      assert.equal(trial.pass, trial.behaviorPass && trial.perceptionPass);
      const last = requests.filter((r) => r.model === trial.model && r.id === trial.id
        && r.repetition === trial.repetition).at(-1);
      const returnedText = JSON.parse(last.responseText).choices[0].message.content;
      assert.deepEqual(JSON.parse(returnedText.match(/\{[\s\S]*\}/)[0]), trial.facts);
    }
  }
  for (const m of summary.models) {
    const rows = trials.filter((r) => r.model === m.model);
    assert.equal(m.trials, rows.length);
    assert.equal(m.passed, rows.filter((r) => r.pass).length);
    assert.equal(m.falseReturns, rows.filter((r) => r.falseReturn).length);
    assert.equal(m.wrongChannels, rows.filter((r) => r.wrongChannel).length);
    assert.equal(m.actualRequests, requests.filter((r) => r.model === m.model).length);
    if (phase.name === 'combined') {
      assert.equal(m.behaviorPassed, rows.filter((r) => r.behaviorPass).length);
      assert.equal(m.missingOrWrongActions, rows.filter((r) => r.behaviorFailures?.includes('next_action')).length);
      assert.equal(m.screeningPass, rows.length === plan.cases.length * plan.repetitions && rows.every((r) => r.pass));
      if (!summary.stopped.some((s) => s.model === m.model)) assert.equal(rows.length, plan.cases.length * plan.repetitions);
    }
  }
  reports.push({ phase: phase.name, planSha256: sha(planBytes), trials: trials.length, requests: requests.length,
    noUsageResponses: requests.filter((r) => { try { return !JSON.parse(r.responseText).usage; } catch { return true; } }).length,
    summary: summary.models.map((m) => ({ ...m, cases: undefined })),
    byCase: plan.cases.map((c) => ({ id: c.id, nextActionAssertion: c.nextAction ?? (c.nextAction === null ? null : 'not_defined'),
      models: plan.models.map((model) => ({ model, outcomes: trials.filter((r) => r.model === model && r.id === c.id).map((r) => ({
        repetition: r.repetition, pass: r.pass, channel: r.actual?.channel, action: r.actual?.next_action?.type ?? null,
        item: r.actual?.item, form: r.facts?.form, material: r.facts?.material,
        mark: r.facts?.deposit_mark_text, foreign: r.facts?.foreign_deposit_mark, error: r.error })) })) })) });
}
const sum = (key) => reports.flatMap((r) => r.summary).reduce((n, r) => n + (r[key] ?? 0), 0);
const result = { checkedAt: new Date().toISOString(), integrity: 'pass', releaseEvidence: false,
  totalTrials: reports.reduce((n, r) => n + r.trials, 0), totalRequests: reports.reduce((n, r) => n + r.requests, 0),
  recordedInputTokens: sum('inputTokens'), recordedOutputTokens: sum('outputTokens'),
  noUsageResponses: reports.reduce((n, r) => n + r.noUsageResponses, 0), reports };
fs.writeFileSync(path.join(output, 'audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ...result, reports: undefined }, null, 2));
