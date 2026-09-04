import { createHash } from 'node:crypto';

import { CHANNEL_STATUS, type Locale } from '@binwhere/core';

import { LOCALE_LANGUAGE_NAME } from '../../src/lib/i18n';
import { getClassifySystemPrompt } from '../../src/lib/ai/prompts/classify-system';
import {
  STRICT_CLASSIFY_RESPONSE_FORMAT,
  TOKENHUB_MAX_TOKENS,
  TOKENHUB_IMAGE_USER_INSTRUCTION,
  TOKENHUB_THINKING_DISABLED,
  type TokenHubProviderOptions,
} from '../../src/lib/ai/providers/tokenhub';
import {
  DEFAULT_EXECUTION_POLICY,
  PRODUCTION_0A5852F_EXECUTION_POLICY,
  type ClassificationExecutionPolicy,
} from '../../src/lib/ai/provider';
import { t } from '../../src/lib/i18n';

const PRODUCTION_REVISION = '0a5852f18a8b119d0a649f491ef781df94e5e2d3';
const LOCALES: readonly Locale[] = ['en', 'zh', 'ms', 'ta'];

/** Exact classify system prompt deployed by production revision 0a5852f. */
const PRODUCTION_BASE_PROMPT = `You are a recycling assistant for Singapore. Given an image or text description of an item, classify it into the correct recycling channel according to NEA (National Environment Agency) guidelines.

## Recycling Channels

| Channel | What goes here | Examples |
|---------|---------------|----------|
| blue_bin | Clean & dry recyclables: paper, plastic, metal, glass | Newspapers, PET bottles, aluminum cans, glass jars |
| return_point | BCRS-eligible beverage containers (S$0.10 refund) | Plastic bottles, aluminum cans (150ml-3L, Deposit Mark visible, barcode intact, not crushed) |
| ewaste | Regulated e-waste (ICT equipment, large appliances) | Laptops, phones, TVs, fridges, washing machines, printers |
| ewaste_battery | Batteries of all types | AA/AAA batteries, button cells, lithium-ion batteries, car batteries |
| lighting | Fluorescent tubes and bulbs | CFL bulbs, fluorescent tubes, LED bulbs |
| textile | Clothes, shoes, bags in reusable condition | T-shirts, jeans, shoes, handbags, curtains |
| hazardous | Toxic or dangerous waste | Paint, pesticides, motor oil, cleaning chemicals, expired medicine |
| bulky_waste | Large items that don't fit in bins | Furniture, mattresses, large appliances (non-e-waste) |
| donation | Items in good condition that can be reused | Working electronics, good clothes, books, toys |
| general_waste | Non-recyclable items | Food waste, dirty/contaminated packaging, styrofoam, tissue paper |

## Classification Rules

1. **Blue bin items MUST be clean and dry**. A pizza box with grease stains → general_waste, NOT blue_bin.
2. **Tissue paper and toilet paper** → always general_waste (too contaminated by design).
3. **Styrofoam** → general_waste (not recyclable in Singapore's blue bin system).
4. **Plastic bags** → blue_bin ONLY if clean and dry. Dirty plastic bags → general_waste.
5. **Tetra Pak / milk cartons** → blue_bin (they are recyclable in Singapore).
6. **Ceramics, mirrors, pyrex** → general_waste (not the same as glass bottles/jars).
7. **BCRS return_point** is ONLY for beverage containers when the Deposit Mark is clearly visible or explicitly stated, and the item otherwise matches BCRS rules (plastic/metal, 150ml-3L, barcode intact, not crushed).
8. **Do NOT guess return_point** just because an item looks like a drink bottle/can. If Deposit Mark is not visible or not mentioned, do NOT use return_point.
9. **If it is likely a beverage bottle/can but Deposit Mark is unknown**, prefer blue_bin and mention in reason or tip: if the container has a Deposit Mark, bring it to a Return Point.
10. **Glass beverage bottles, cartons, and pouches** are NOT return_point.
11. **E-waste batteries** must go to ewaste_battery, NOT blue_bin or general_waste.
12. **When in doubt**, return status "not_sure" with confidence < 0.5. Do NOT guess.
13. **Items in good, reusable condition** (clothes, electronics, books) → consider "donation" or "consider_donating".

## Status Guide

- "recyclable" (green) → Can be recycled via the specified channel
- "special_handling" (orange) → Needs special disposal (e-waste, hazardous, bulky)
- "consider_donating" (blue) → Item is in good condition, consider donating first
- "not_recyclable" (gray) → Goes to general waste
- "not_sure" (light gray) → Cannot determine with confidence

## Output Format

Respond ONLY with a valid JSON object (no markdown, no explanation):

{
  "item": "identified item name",
  "status": "recyclable|special_handling|consider_donating|not_recyclable|not_sure",
  "confidence": 0.0-1.0,
  "channel": "channel_name or null if not_sure",
  "reason": "brief explanation",
  "preparation": ["step 1", "step 2"],
  "tip": "extra helpful tip (optional)"
}

Write Singapore dollar amounts with the "S$" prefix — the BCRS refund is S$0.10, never $0.10. A bare "$" reads as US dollars.`;

function getProductionSystemPrompt(locale: Locale = 'en'): string {
  const langName = LOCALE_LANGUAGE_NAME[locale];
  return `${PRODUCTION_BASE_PROMPT}

## Language

You MUST respond in ${langName}.
All JSON text fields (item, reason, preparation, tip) MUST be in ${langName}.
The "status" and "channel" fields MUST remain exactly as shown in English (e.g. "recyclable", "blue_bin"). Do NOT translate enum values.
Currency amounts, numbers and units are NOT translated: write "S$0.10" and "150ml-3L" verbatim in Latin characters in every language. Never convert an amount to another currency or numeral system.
Keep responses concise and practical.`;
}

export interface ClassificationProfile {
  id: string;
  revision: string;
  providerOptions: TokenHubProviderOptions;
  executionPolicy: ClassificationExecutionPolicy;
}

export const PRODUCTION_PROFILE: ClassificationProfile = {
  id: 'production-0a5852f',
  revision: PRODUCTION_REVISION,
  providerOptions: {
    getSystemPrompt: getProductionSystemPrompt,
    imageUserInstruction: '',
    textTemperature: 0.3,
    visionTemperature: 0.3,
    ensureBcrsRefund: false,
    textModel: 'hy3',
    visionModel: 'hy-vision-2.0-instruct',
    strictResponseSchema: false,
    enforceNotSurePolicy: false,
    validateResultSemantics: false,
  },
  executionPolicy: PRODUCTION_0A5852F_EXECUTION_POLICY,
};

export const CANDIDATE_PROFILE: ClassificationProfile = {
  id: 'candidate-working-tree',
  revision: 'working-tree',
  providerOptions: {
    getSystemPrompt: getClassifySystemPrompt,
    imageUserInstruction: TOKENHUB_IMAGE_USER_INSTRUCTION,
    textTemperature: 0,
    visionTemperature: 0.6,
    ensureBcrsRefund: true,
    textModel: 'hy3',
    visionModel: 'kimi-k2.6',
    strictResponseSchema: true,
    enforceNotSurePolicy: true,
    validateResultSemantics: true,
  },
  executionPolicy: DEFAULT_EXECUTION_POLICY,
};

export function selectProfile(value = 'candidate'): ClassificationProfile {
  if (value === 'candidate') return CANDIDATE_PROFILE;
  if (value === 'production') return PRODUCTION_PROFILE;
  throw new Error(`Invalid --profile=${value}; expected production or candidate`);
}

export function profileDigest(profile: ClassificationProfile): string {
  const getPrompt = profile.providerOptions.getSystemPrompt;
  if (!getPrompt) throw new Error(`Profile ${profile.id} has no system prompt`);
  const payload = {
    prompts: Object.fromEntries(LOCALES.map((locale) => [locale, getPrompt(locale)])),
    imageUserInstruction: profile.providerOptions.imageUserInstruction,
    temperature: profile.providerOptions.textTemperature === profile.providerOptions.visionTemperature
      ? profile.providerOptions.textTemperature
      : {
          text: profile.providerOptions.textTemperature,
          vision: profile.providerOptions.visionTemperature,
        },
    ensureBcrsRefund: profile.providerOptions.ensureBcrsRefund,
    textModel: profile.providerOptions.textModel,
    visionModel: profile.providerOptions.visionModel,
    strictResponseSchema: profile.providerOptions.strictResponseSchema,
    enforceNotSurePolicy: profile.providerOptions.enforceNotSurePolicy,
    validateResultSemantics: profile.providerOptions.validateResultSemantics,
    requestContract: {
      maxTokens: TOKENHUB_MAX_TOKENS,
      thinking: TOKENHUB_THINKING_DISABLED,
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
    executionPolicy: profile.executionPolicy,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
