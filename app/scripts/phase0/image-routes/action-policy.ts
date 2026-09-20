import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import sharp from 'sharp';

import { classifyItem } from '../../../src/lib/ai/provider';
import { getClassifySystemPrompt } from '../../../src/lib/ai/prompts/classify-system';
import {
  ACTION_CLASSIFY_RESPONSE_FORMAT,
  TOKENHUB_IMAGE_USER_INSTRUCTION,
  TOKENHUB_MAX_TOKENS,
  TOKENHUB_THINKING_DISABLED,
  TOKENHUB_VISION_MODEL,
  TokenHubProvider,
} from '../../../src/lib/ai/providers/tokenhub';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../..');
const root = path.resolve(app, '..');
const previous = path.join(app, 'scripts/phase0/results/image-routes-20260920/combined');
const output = path.join(app, 'scripts/phase0/results/image-routes-20260920/action-policy-v1');
const planFile = path.join(here, 'action-policy-plan.json');
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
  }));
}

const transform = (buffer: Buffer) => sharp(buffer)
  .rotate()
  .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
  .flatten({ background: '#ffffff' })
  .jpeg({ quality: 70 })
  .toBuffer();

interface SourceCase {
  id: string;
  source: string;
  crop?: { left: number; top: number; width: number; height: number };
  actions: readonly (string | null)[];
  channels?: readonly (string | null)[];
  forbiddenChannels?: readonly string[];
  evidence?: Readonly<Record<string, string | boolean>>;
}

const sourceCases: readonly SourceCase[] = [
  {
    id: 'same-can-full', source: 'sources/coca-cola-life-full-can.jpg',
    actions: ['try_return_point'], channels: [null],
    evidence: { subject: 'single_prepackaged_beverage_container', whole_container_visible: true, form: 'can', material: 'metal' },
  },
  {
    id: 'same-can-label-crop', source: 'sources/coca-cola-life-full-can.jpg',
    crop: { left: 330, top: 430, width: 1120, height: 1050 },
    actions: ['check_container_type'], channels: [null],
    evidence: { subject: 'single_prepackaged_beverage_container', whole_container_visible: false, form: 'unknown', material: 'unknown' },
  },
  {
    id: 'partial-can-v7', source: 'holdout-single-angle-malaysia-can-v7.jpg',
    actions: ['check_container_type', 'try_return_point'], channels: [null],
    evidence: { subject: 'single_prepackaged_beverage_container', whole_container_visible: false },
  },
  {
    id: 'full-pouch-control', source: 'sources/capri-sun-pouch.jpg',
    actions: [null], forbiddenChannels: ['return_point'],
    evidence: { subject: 'single_prepackaged_beverage_container', whole_container_visible: true, form: 'pouch', material: 'composite' },
  },
  {
    id: 'blurred-singapore-mark', source: 'holdout-singapore-mark-closeup.jpg',
    actions: ['check_container_type', 'try_return_point'], channels: [null],
  },
  {
    id: 'explicit-foreign-mark', source: 'holdout-foreign-refund-mark.jpg',
    actions: [null], forbiddenChannels: ['return_point'],
  },
  {
    id: 'clear-singapore-mark-and-barcode', source: 'holdout-single-bottle-mark-and-barcode-v16.jpg',
    actions: ['return_container'], channels: ['return_point'],
  },
  {
    id: 'full-glass-bottle', source: 'holdout-glass-sprite-action-v18.jpg',
    actions: [null], channels: ['blue_bin'],
    evidence: { subject: 'single_prepackaged_beverage_container', whole_container_visible: true, form: 'bottle', material: 'glass' },
  },
] as const;

function evaluate(test: SourceCase, result: Record<string, unknown>, evidence: Record<string, unknown> | undefined) {
  const failures: string[] = [];
  const action = (result.next_action as { type?: string } | undefined)?.type ?? null;
  const channel = result.channel ?? null;
  if (!(test.actions as readonly unknown[]).includes(action)) failures.push(`action:${String(action)}`);
  if (test.channels && !test.channels.includes(channel as string | null)) failures.push(`channel:${String(channel)}`);
  if (test.forbiddenChannels?.includes(channel as string)) {
    failures.push(`forbidden_channel:${String(channel)}`);
  }
  if (test.evidence) {
    for (const [key, expected] of Object.entries(test.evidence)) {
      if (evidence?.[key] !== expected) failures.push(`evidence.${key}:${String(evidence?.[key])}`);
    }
  }
  return { pass: failures.length === 0, failures, action, channel };
}

async function main() {
if (process.argv[2] === 'prepare') {
  if (fs.existsSync(planFile)) throw new Error('Plan already frozen. Create a new experiment id.');
  fs.mkdirSync(output, { recursive: true });
  const cases = [];
  for (const test of sourceCases) {
    const source = fs.readFileSync(path.join(previous, test.source));
    const framed = test.crop ? await sharp(source).extract(test.crop).toBuffer() : source;
    const submitted = await transform(await transform(framed));
    const filename = `${test.id}.jpg`;
    fs.writeFileSync(path.join(output, filename), submitted, { flag: 'wx' });
    const metadata = await sharp(submitted).metadata();
    cases.push({
      ...test,
      filename,
      sourceSha256: sha(source),
      submittedSha256: sha(submitted),
      submittedBytes: submitted.length,
      width: metadata.width,
      height: metadata.height,
    });
  }
  const plan = {
    id: 'image-action-policy-v1',
    frozenAt: new Date().toISOString(),
    purpose: 'Screen the deployable image action policy on paired full/cropped input and the known refund, can, pouch and glass failures.',
    releaseEvidence: false,
    model: TOKENHUB_VISION_MODEL,
    repetitions: 3,
    logicalCalls: cases.length * 3,
    candidateDigest: candidateDigest(),
    harnessSha256: sha(fs.readFileSync(scriptFile)),
    cases,
    passRule: 'Every repetition must satisfy its allowed channel, action and listed evidence facts. Any confirmed refund on the blurred or foreign mark fails.',
    limitations: [
      'Developer-visible screening, not fresh release evidence.',
      'Repeated calls are stability checks, not independent image samples.',
      'The same model emits classification and structured observations; deterministic policy validates consistency but does not create independent visual truth.',
    ],
  };
  fs.writeFileSync(planFile, `${JSON.stringify(plan, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ plan: plan.id, calls: plan.logicalCalls, sha256: sha(fs.readFileSync(planFile)) }));
} else if (process.argv[2] === 'run') {
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8')) as {
    candidateDigest: string; harnessSha256: string; repetitions: number;
    cases: Array<SourceCase & { filename: string; submittedSha256: string }>;
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
  let active: { id: string; repetition: number; evidence?: Record<string, unknown> } | undefined;
  globalThis.fetch = async (input, init) => {
    const startedAt = new Date().toISOString();
    const started = Date.now();
    const body = String(init?.body ?? '');
    const redacted = JSON.parse(body);
    const image = redacted.messages?.[1]?.content?.find((part: { type?: string }) => part.type === 'image_url');
    if (image?.image_url?.url) image.image_url.url = `sha256:${sha(body)}`;
    try {
      const response = await realFetch(input, init);
      const responseText = await response.clone().text();
      try {
        const content = JSON.parse(responseText).choices?.[0]?.message?.content;
        const match = typeof content === 'string' ? content.match(/\{[\s\S]*\}/) : null;
        active!.evidence = match ? JSON.parse(match[0]).beverage_evidence : undefined;
      } catch { /* The provider records invalid output as a trial failure. */ }
      fs.appendFileSync(requestsFile, `${JSON.stringify({
        id: active?.id, repetition: active?.repetition, startedAt, latencyMs: Date.now() - started,
        requestSha256: sha(body), request: redacted, httpStatus: response.status, responseText,
      })}\n`);
      return response;
    } catch (error) {
      fs.appendFileSync(requestsFile, `${JSON.stringify({
        id: active?.id, repetition: active?.repetition, startedAt, latencyMs: Date.now() - started,
        requestSha256: sha(body), request: redacted, error: String(error),
      })}\n`);
      throw error;
    }
  };

  const provider = new TokenHubProvider();
  const trials = [];
  try {
    for (let repetition = 1; repetition <= plan.repetitions; repetition += 1) {
      const shifted = [...plan.cases.slice(repetition - 1), ...plan.cases.slice(0, repetition - 1)];
      for (const test of shifted) {
        active = { id: test.id, repetition };
        const started = Date.now();
        try {
          const image = fs.readFileSync(path.join(output, test.filename)).toString('base64');
          const result = await classifyItem({ image, locale: 'en' }, provider);
          const verdict = evaluate(test, result as unknown as Record<string, unknown>, active.evidence);
          const trial = { id: test.id, repetition, latencyMs: Date.now() - started, result, evidence: active.evidence, ...verdict };
          trials.push(trial);
          fs.appendFileSync(trialsFile, `${JSON.stringify(trial)}\n`);
          console.log(JSON.stringify({ id: test.id, repetition, pass: verdict.pass, channel: verdict.channel,
            action: verdict.action, evidence: active.evidence, failures: verdict.failures, ms: trial.latencyMs }));
        } catch (error) {
          const trial = { id: test.id, repetition, latencyMs: Date.now() - started, pass: false, error: String(error), evidence: active.evidence };
          trials.push(trial);
          fs.appendFileSync(trialsFile, `${JSON.stringify(trial)}\n`);
          console.log(JSON.stringify(trial));
        }
      }
    }
  } finally {
    globalThis.fetch = realFetch;
  }
  const summary = {
    completedAt: new Date().toISOString(),
    releaseEvidence: false,
    trials: trials.length,
    passed: trials.filter((trial) => trial.pass).length,
    failed: trials.filter((trial) => !trial.pass).length,
    screeningPass: trials.length === plan.cases.length * plan.repetitions && trials.every((trial) => trial.pass),
    failures: trials.filter((trial) => !trial.pass).map((trial) => ({ id: trial.id, repetition: trial.repetition, failures: 'failures' in trial ? trial.failures : [trial.error] })),
  };
  fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify(summary, null, 2));
} else {
  throw new Error('Use prepare or run.');
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
