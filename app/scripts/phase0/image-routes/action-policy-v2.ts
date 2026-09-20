import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

import { classifyItem } from '../../../src/lib/ai/provider';
import { getClassifySystemPrompt } from '../../../src/lib/ai/prompts/classify-system';
import {
  ACTION_CLASSIFY_RESPONSE_FORMAT,
  BCRS_IMAGE_VERIFICATION_PROMPT,
  BCRS_IMAGE_VERIFICATION_RESPONSE_FORMAT,
  TOKENHUB_IMAGE_USER_INSTRUCTION,
  TOKENHUB_MAX_TOKENS,
  TOKENHUB_THINKING_DISABLED,
  TOKENHUB_VISION_MODEL,
  TokenHubProvider,
} from '../../../src/lib/ai/providers/tokenhub';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../..');
const root = path.resolve(app, '..');
const v1Output = path.join(app, 'scripts/phase0/results/image-routes-20260920/action-policy-v1');
const output = path.join(app, 'scripts/phase0/results/image-routes-20260920/action-policy-v2');
const planFile = path.join(here, 'action-policy-v2-plan.json');
const scriptFile = fileURLToPath(import.meta.url);
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

const candidateFiles = [
  'app/src/lib/ai/prompts/classify-system.ts',
  'app/src/lib/ai/prompts/classify-image.ts',
  'app/src/lib/ai/providers/tokenhub.ts',
  'packages/core/src/next-action.ts',
  'packages/core/src/types/classify.ts',
  'packages/core/src/i18n/locales/en.ts',
] as const;

function candidateDigest() {
  return sha(JSON.stringify({
    files: Object.fromEntries(candidateFiles.map((file) => [file, sha(fs.readFileSync(path.join(root, file)))])),
    model: TOKENHUB_VISION_MODEL,
    maxTokens: TOKENHUB_MAX_TOKENS,
    thinking: TOKENHUB_THINKING_DISABLED,
    responseFormat: ACTION_CLASSIFY_RESPONSE_FORMAT,
    systemPrompt: getClassifySystemPrompt('en', 'image'),
    userInstruction: TOKENHUB_IMAGE_USER_INSTRUCTION,
    verificationPrompt: BCRS_IMAGE_VERIFICATION_PROMPT,
    verificationResponseFormat: BCRS_IMAGE_VERIFICATION_RESPONSE_FORMAT,
  }));
}

interface CaseSpec {
  id: string;
  filename: string;
  actions: readonly (string | null)[];
  channels?: readonly (string | null)[];
  forbiddenChannels?: readonly string[];
  evidence?: Readonly<Record<string, string | boolean>>;
}

const sourceCases: readonly CaseSpec[] = [
  {
    id: 'same-can-full', filename: 'same-can-full.jpg',
    actions: ['try_return_point'], channels: [null],
    evidence: { subject: 'single_prepackaged_beverage_container', whole_container_visible: true, form: 'can', material: 'metal' },
  },
  {
    id: 'same-can-label-crop', filename: 'same-can-label-crop.jpg',
    actions: ['check_container_type'], channels: [null],
    evidence: { subject: 'single_prepackaged_beverage_container', whole_container_visible: false },
  },
  {
    id: 'partial-can-v7', filename: 'partial-can-v7.jpg',
    actions: ['check_container_type', 'try_return_point'], channels: [null],
    evidence: { subject: 'single_prepackaged_beverage_container', whole_container_visible: false },
  },
  {
    id: 'full-pouch-control', filename: 'full-pouch-control.jpg',
    actions: [null], forbiddenChannels: ['return_point'],
    evidence: { subject: 'single_prepackaged_beverage_container', whole_container_visible: true, form: 'pouch', material: 'composite' },
  },
  {
    id: 'blurred-singapore-mark', filename: 'blurred-singapore-mark.jpg',
    actions: ['check_container_type', 'try_return_point'], channels: [null],
  },
  {
    id: 'explicit-foreign-mark', filename: 'explicit-foreign-mark.jpg',
    actions: [null], forbiddenChannels: ['return_point'],
  },
  {
    id: 'clear-singapore-mark-and-barcode', filename: 'clear-singapore-mark-and-barcode.jpg',
    actions: ['return_container'], channels: ['return_point'],
  },
  {
    id: 'full-glass-bottle', filename: 'full-glass-bottle.jpg',
    actions: [null], channels: ['blue_bin'],
    evidence: { subject: 'single_prepackaged_beverage_container', whole_container_visible: true, form: 'bottle', material: 'glass' },
  },
] as const;

function evaluate(test: CaseSpec, result: Record<string, unknown>, evidence: Record<string, unknown> | undefined) {
  const failures: string[] = [];
  const action = (result.next_action as { type?: string } | undefined)?.type ?? null;
  const channel = result.channel ?? null;
  if (!test.actions.includes(action)) failures.push(`action:${String(action)}`);
  if (test.channels && !test.channels.includes(channel as string | null)) failures.push(`channel:${String(channel)}`);
  if (test.forbiddenChannels?.includes(channel as string)) failures.push(`forbidden_channel:${String(channel)}`);
  for (const [key, expected] of Object.entries(test.evidence ?? {})) {
    if (evidence?.[key] !== expected) failures.push(`evidence.${key}:${String(evidence?.[key])}`);
  }
  return { pass: failures.length === 0, failures, action, channel };
}

async function main() {
  if (process.argv[2] === 'prepare') {
    if (fs.existsSync(planFile)) throw new Error('Plan already frozen. Create a new experiment id.');
    fs.mkdirSync(output, { recursive: true });
    const cases = sourceCases.map((test) => {
      const bytes = fs.readFileSync(path.join(v1Output, test.filename));
      fs.writeFileSync(path.join(output, test.filename), bytes, { flag: 'wx' });
      return { ...test, submittedSha256: sha(bytes), submittedBytes: bytes.length };
    });
    const plan = {
      id: 'image-action-policy-v2',
      frozenAt: new Date().toISOString(),
      purpose: 'Retest the exact deployable policy with veto-only pixel transcription for refund claims and deterministic clean-glass routing.',
      releaseEvidence: false,
      model: TOKENHUB_VISION_MODEL,
      repetitions: 3,
      logicalClassificationCalls: cases.length * 3,
      verificationCalls: 'Only primary return_point claims trigger a second request.',
      candidateDigest: candidateDigest(),
      harnessSha256: sha(fs.readFileSync(scriptFile)),
      cases,
      passRule: 'Every repetition must satisfy its channel, action and listed evidence facts. Blurred and foreign marks have zero tolerance for confirmed refunds; clear SG mark recall is required in every repetition.',
      limitations: [
        'Developer-visible screening, not fresh release evidence.',
        'Repeated calls are stability checks, not independent image samples.',
        'The verifier uses the same model with a separate transcription-only request and can veto but never promote a refund claim.',
      ],
    };
    fs.writeFileSync(planFile, `${JSON.stringify(plan, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify({ plan: plan.id, classificationCalls: plan.logicalClassificationCalls,
      sha256: sha(fs.readFileSync(planFile)) }));
    return;
  }

  if (process.argv[2] !== 'run') throw new Error('Use prepare or run.');
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8')) as {
    candidateDigest: string; harnessSha256: string; repetitions: number;
    cases: Array<CaseSpec & { submittedSha256: string }>;
  };
  if (plan.candidateDigest !== candidateDigest()) throw new Error('Candidate changed after the plan was frozen.');
  if (plan.harnessSha256 !== sha(fs.readFileSync(scriptFile))) throw new Error('Harness changed after the plan was frozen.');
  for (const test of plan.cases) {
    if (sha(fs.readFileSync(path.join(output, test.filename))) !== test.submittedSha256) {
      throw new Error(`Input changed: ${test.id}`);
    }
  }
  const trialsFile = path.join(output, 'trials.jsonl');
  const requestsFile = path.join(output, 'requests.jsonl');
  if (fs.existsSync(trialsFile) || fs.existsSync(requestsFile)) throw new Error('Run already exists.');
  dotenv.config({ path: path.join(app, '.env'), quiet: true });
  if (!process.env.TOKENHUB_API_KEY) throw new Error('Missing TOKENHUB_API_KEY.');

  const realFetch = globalThis.fetch;
  let active: {
    id: string; repetition: number;
    evidence?: Record<string, unknown>;
    verification?: Record<string, unknown>;
    requests: number;
  } | undefined;
  globalThis.fetch = async (input, init) => {
    const startedAt = new Date().toISOString();
    const started = Date.now();
    const bodyText = String(init?.body ?? '');
    const body = JSON.parse(bodyText);
    const schemaName = body.response_format?.json_schema?.name;
    const redacted = structuredClone(body);
    const image = redacted.messages?.[1]?.content?.find((part: { type?: string }) => part.type === 'image_url');
    if (image?.image_url?.url) image.image_url.url = `sha256:${sha(bodyText)}`;
    active!.requests += 1;
    try {
      const response = await realFetch(input, init);
      const responseText = await response.clone().text();
      try {
        const content = JSON.parse(responseText).choices?.[0]?.message?.content;
        const match = typeof content === 'string' ? content.match(/\{[\s\S]*\}/) : null;
        const parsed = match ? JSON.parse(match[0]) : undefined;
        if (schemaName === 'binwhere_classification') active!.evidence = parsed?.beverage_evidence;
        if (schemaName === 'binwhere_bcrs_image_verification') active!.verification = parsed;
      } catch { /* Invalid output remains in the recorded raw response. */ }
      fs.appendFileSync(requestsFile, `${JSON.stringify({
        id: active?.id, repetition: active?.repetition, stage: schemaName, startedAt,
        latencyMs: Date.now() - started, requestSha256: sha(bodyText), request: redacted,
        httpStatus: response.status, responseText,
      })}\n`);
      return response;
    } catch (error) {
      fs.appendFileSync(requestsFile, `${JSON.stringify({
        id: active?.id, repetition: active?.repetition, stage: schemaName, startedAt,
        latencyMs: Date.now() - started, requestSha256: sha(bodyText), request: redacted,
        error: String(error),
      })}\n`);
      throw error;
    }
  };

  const provider = new TokenHubProvider();
  const trials: Array<Record<string, unknown> & { pass: boolean }> = [];
  try {
    for (let repetition = 1; repetition <= plan.repetitions; repetition += 1) {
      const shifted = [...plan.cases.slice(repetition - 1), ...plan.cases.slice(0, repetition - 1)];
      for (const test of shifted) {
        active = { id: test.id, repetition, requests: 0 };
        const started = Date.now();
        try {
          const image = fs.readFileSync(path.join(output, test.filename)).toString('base64');
          const result = await classifyItem({ image, locale: 'en' }, provider);
          const verdict = evaluate(test, result as unknown as Record<string, unknown>, active.evidence);
          const trial = { id: test.id, repetition, latencyMs: Date.now() - started, requests: active.requests,
            result, evidence: active.evidence, verification: active.verification, ...verdict };
          trials.push(trial);
          fs.appendFileSync(trialsFile, `${JSON.stringify(trial)}\n`);
          console.log(JSON.stringify({ id: test.id, repetition, pass: verdict.pass, channel: verdict.channel,
            action: verdict.action, evidence: active.evidence, verification: active.verification,
            requests: active.requests, failures: verdict.failures, ms: trial.latencyMs }));
        } catch (error) {
          const trial = { id: test.id, repetition, latencyMs: Date.now() - started, requests: active.requests,
            pass: false, error: String(error), evidence: active.evidence, verification: active.verification };
          trials.push(trial);
          fs.appendFileSync(trialsFile, `${JSON.stringify(trial)}\n`);
          console.log(JSON.stringify(trial));
        }
      }
    }
  } finally {
    globalThis.fetch = realFetch;
  }
  const latencies = trials.map((trial) => Number(trial.latencyMs)).sort((a, b) => a - b);
  const summary = {
    completedAt: new Date().toISOString(),
    releaseEvidence: false,
    trials: trials.length,
    passed: trials.filter((trial) => trial.pass).length,
    failed: trials.filter((trial) => !trial.pass).length,
    screeningPass: trials.length === plan.cases.length * plan.repetitions && trials.every((trial) => trial.pass),
    totalRequests: trials.reduce((sum, trial) => sum + Number(trial.requests), 0),
    latencyP50Ms: latencies[Math.ceil(latencies.length * 0.5) - 1],
    latencyP95Ms: latencies[Math.ceil(latencies.length * 0.95) - 1],
    failures: trials.filter((trial) => !trial.pass).map((trial) => ({
      id: trial.id, repetition: trial.repetition,
      failures: 'failures' in trial ? trial.failures : [trial.error],
    })),
  };
  fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
