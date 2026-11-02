import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CHANNEL_STATUS, IMAGE_MAX_SIZE, type Locale } from '@binwhere/core';

import { getClassifySystemPrompt } from '../../src/lib/ai/prompts/classify-system';
import {
  STRICT_CLASSIFY_RESPONSE_FORMAT,
  ACTION_CLASSIFY_RESPONSE_FORMAT,
  TOKENHUB_IMAGE_USER_INSTRUCTION,
  TOKENHUB_TEXT_REQUEST,
  TOKENHUB_VISION_REQUEST,
  type TokenHubProviderOptions,
} from '../../src/lib/ai/providers/tokenhub';
import {
  DEFAULT_EXECUTION_POLICY,
  type ClassificationExecutionPolicy,
} from '../../src/lib/ai/provider';
import { t } from '../../src/lib/i18n';

/** Actual deployment from 2026-10-25; execution uses its own installed dependencies. */
export const PRODUCTION_REVISION = '5a19b7f0854ac15a63263996692601eaaa5554b0';
const LOCALES: readonly Locale[] = ['en', 'zh', 'ms', 'ta'];

function fileDigest(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const CANDIDATE_EXECUTION_SOURCE_PATHS = {
  retryController: join(__dirname, '../../src/lib/ai/provider.ts'),
  tokenHubProvider: join(__dirname, '../../src/lib/ai/providers/tokenhub.ts'),
  classifyRoute: join(__dirname, '../../src/app/api/v1/classify/route.ts'),
  imageSanitizer: join(__dirname, '../../src/lib/image-security.ts'),
  resultContract: join(__dirname, '../../../packages/core/src/types/classify.ts'),
  actionPolicy: join(__dirname, '../../../packages/core/src/next-action.ts'),
} as const;

function candidateExecutionSourceDigests() {
  return Object.fromEntries(Object.entries(CANDIDATE_EXECUTION_SOURCE_PATHS)
    .map(([name, path]) => [name, fileDigest(path)]));
}

const CANDIDATE_EXECUTION_SOURCE_DIGESTS = candidateExecutionSourceDigests();
const CANDIDATE_SOURCE_REVISION = `source-${createHash('sha256')
  .update(JSON.stringify(CANDIDATE_EXECUTION_SOURCE_DIGESTS))
  .digest('hex')}`;

export interface ClassificationProfile {
  id: string;
  revision: string;
  imageMaxSize: number;
  providerOptions: TokenHubProviderOptions;
  executionPolicy: ClassificationExecutionPolicy;
}

/** Identity only. Production classification must execute revision 5a19b7f itself. */
export const PRODUCTION_PROFILE = {
  id: 'production-5a19b7f',
  revision: PRODUCTION_REVISION,
} as const;

export const CANDIDATE_PROFILE: ClassificationProfile = {
  id: 'candidate-source-bound',
  revision: CANDIDATE_SOURCE_REVISION,
  imageMaxSize: IMAGE_MAX_SIZE,
  providerOptions: {
    getSystemPrompt: getClassifySystemPrompt,
    imageUserInstruction: TOKENHUB_IMAGE_USER_INSTRUCTION,
    textTemperature: 0,
    ensureBcrsRefund: true,
    textModel: 'hy3',
    visionModel: 'kimi-k3.1-pro',
    strictResponseSchema: true,
    enforceNotSurePolicy: true,
    validateResultSemantics: true,
    nextActions: true,
  },
  executionPolicy: DEFAULT_EXECUTION_POLICY,
};

export function selectProfile(value = 'candidate'): ClassificationProfile {
  if (value === 'candidate') return CANDIDATE_PROFILE;
  if (value === 'production') {
    throw new Error('Production cannot run in candidate code. Execute 5a19b7f in a separate git worktree using npm run baseline:production -- --worktree=<absolute-path>; see docs/classify-eval.md.');
  }
  throw new Error(`Invalid --profile=${value}; expected production or candidate`);
}

export function profileDigest(profile: ClassificationProfile): string {
  const getPrompt = profile.providerOptions.getSystemPrompt;
  if (!getPrompt) throw new Error(`Profile ${profile.id} has no system prompt`);
  const payload = {
    prompts: Object.fromEntries(LOCALES.map((locale) => [locale, getPrompt(locale)])),
    imageUserInstruction: profile.providerOptions.imageUserInstruction,
    imageMaxSize: profile.imageMaxSize,
    textTemperature: profile.providerOptions.textTemperature,
    ensureBcrsRefund: profile.providerOptions.ensureBcrsRefund,
    textModel: profile.providerOptions.textModel,
    visionModel: profile.providerOptions.visionModel,
    strictResponseSchema: profile.providerOptions.strictResponseSchema,
    enforceNotSurePolicy: profile.providerOptions.enforceNotSurePolicy,
    validateResultSemantics: profile.providerOptions.validateResultSemantics,
    requestContract: {
      text: TOKENHUB_TEXT_REQUEST,
      image: TOKENHUB_VISION_REQUEST,
      responseFormat: profile.providerOptions.strictResponseSchema
        ? STRICT_CLASSIFY_RESPONSE_FORMAT
        : { type: 'json_object' },
    },
    deterministicPostProcessing: {
      statusChannelPolicy: profile.providerOptions.validateResultSemantics
        ? { channelStatus: CHANNEL_STATUS, nullChannelStatus: 'not_sure' }
        : false,
      notSure: profile.providerOptions.enforceNotSurePolicy
        ? Object.fromEntries(LOCALES.map((locale) => [locale, {
            reason: t(locale, 'classify.notSureReason'),
            preparation: t(locale, 'classify.notSurePreparation'),
            channel: null,
            maxConfidence: 0.49,
          }]))
        : false,
      bcrsRefund: profile.providerOptions.ensureBcrsRefund
        ? Object.fromEntries(LOCALES.map((locale) => [locale, {
            reason: t(locale, 'bcrs.classifyReason'),
            preparation: [
              t(locale, 'bcrs.step1'),
              t(locale, 'bcrs.step2'),
              t(locale, 'bcrs.step3'),
              t(locale, 'bcrs.step4'),
            ],
            tip: t(locale, 'bcrs.refundAmount'),
          }]))
        : false,
    },
    // Timeouts and retries are tuned to the endpoint, so they belong to the current
    // code, which the candidate's revision binds. Only the validation switch is an input.
    executionPolicy: { validateResultSemantics: profile.executionPolicy.validateResultSemantics },
  };
  // Source files are bound by the candidate's revision rather than here, so a
  // profile's digest moves only when its own inputs do. That includes how the
  // container policy resolves observations: it is code, not a model input.
  const actionContract = profile.providerOptions.nextActions ? {
    textPrompts: Object.fromEntries(LOCALES.map((locale) => [locale, getPrompt(locale, 'text')])),
    imagePrompts: Object.fromEntries(LOCALES.map((locale) => [locale, getPrompt(locale, 'image')])),
    responseFormat: ACTION_CLASSIFY_RESPONSE_FORMAT,
    copy: Object.fromEntries(LOCALES.map((locale) => [locale, [
      'action.return.title', 'action.return.instruction', 'action.return.qualification',
      'action.try.title', 'action.try.instruction', 'action.try.qualification',
      'action.check.title', 'action.check.instruction', 'action.check.qualification',
      'classify.cleanGlassReason', 'classify.cleanGlassPreparation',
      'classify.excludedBeverageReason', 'classify.excludedBeveragePreparation',
      'classify.contaminatedBeverageReason', 'classify.contaminatedBeveragePreparation',
    ].map((key) => t(locale, key as Parameters<typeof t>[1]))])),
  } : undefined;
  return createHash('sha256').update(JSON.stringify({ ...payload, actionContract })).digest('hex');
}
