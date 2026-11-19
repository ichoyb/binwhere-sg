import {
  ClassifyResultSchema,
  ClassifyResultShapeSchema,
  type ClassifyProvider,
  type ClassifyRequest,
  type ClassifyResult,
} from '../types';
import { getClassifySystemPrompt } from '../prompts/classify-system';
import { LOCALE_LANGUAGE_NAME, t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { logEvent } from '@/lib/telemetry';
import { z } from 'zod';
import {
  ItemKindSchema,
  isEwasteItemKind,
  applyItemKindPolicy,
  BeverageEvidenceSchema,
  BEVERAGE_EVIDENCE_JSON_SCHEMA,
  CHANNEL_STATUS,
  applyBeverageActionPolicy,
  toUnconfirmed,
  type ChannelType,
} from '@binwhere/core';

const API_URL = 'https://tokenhub-intl.tencentcloudmaas.com/v1/chat/completions';

export const TOKENHUB_IMAGE_USER_INSTRUCTION =
  'Report the container facts in beverage_evidence for the single foreground object. Identify the product from its printed product text and physical form, never from the brand alone. Count physical containers, not loose wrapping; distinguish outer multipack packaging, including one container seen through multipack wrap, from one drink container. Use visible shape and material, and a readable capacity or visibly evident size; otherwise leave capacity unknown, which never excludes the container. Mark damage or contamination true only when observed. A readable 10¢ SG RETURN Deposit Mark printed on the drink container can fill an unknown shape or material; it never overrides known exclusions. Do not read or classify foreign deposit marks. Choose the channel by the container-category rules; the Return Point scans the barcode to decide acceptance.';

export interface TokenHubProviderOptions {
  getSystemPrompt?: typeof getClassifySystemPrompt;
  imageUserInstruction?: string;
  textTemperature?: number;
  ensureBcrsRefund?: boolean;
  textModel?: string;
  visionModel?: string;
  strictResponseSchema?: boolean;
  enforceNotSurePolicy?: boolean;
  validateResultSemantics?: boolean;
  nextActions?: boolean;
}

/**
 * Text-only classification. Measured 2026-08-10 against the real system prompt on
 * the hardest BCRS case (aluminium can *with* a Deposit Mark, which must resolve to
 * return_point rather than blue_bin): 1.9s en / 1.9s zh / 2.1s ms / 4.4s ta, all
 * four correct and in the right script, and 4/4 identical on a repeated English run
 * — no sampling drift of the kind that used to flip blue_bin and return_point.
 *
 * Chosen over mimo-v2.5-pro (correct but ~2x slower) and, decisively, over the
 * reasoning models: glm-5-turbo spent 1483-3641 tokens thinking, ran into
 * max_tokens, and truncated the JSON so the S$0.10 deposit vanished — the same
 * failure that gpt-oss produced on the previous provider.
 *
 * That choice rested on "hy3 emits zero reasoning tokens", which was true when
 * measured and stopped being true on 2026-08-29 with no change on this side: hy3
 * began spending 445-608 tokens thinking, which cost a real user an HTTP 500 and
 * pushed the rest to 7-15s. The durable lesson is not about this model. A vendor's
 * default is not a contract, so the request below now *states* the requirement
 * rather than inheriting it, and logUsage treats a nonzero reasoning count as the
 * provider ignoring that instruction.
 *
 * hy4 was evaluated on 2026-08-30 and rejected: `hy4-preview` is the only hy4 build
 * on the account, it ignores the thinking switch, and it spent all 1024 output
 * tokens reasoning — finish_reason=length, empty content, 38s — which is the
 * glm-5-turbo failure again. Preview-tier is also withdrawable without notice.
 */
export const TOKENHUB_TEXT_MODEL = 'hy3';

/**
 * Image classification reports container facts in one model call.
 *
 * kimi-k2.6, which could turn thinking off, drifted on the thirteen hardest refund
 * photos from 12/13 in September to 7/13 in October with no change on this side.
 * Screened against four other image models on the sixteen hardest cases, two
 * samples each, on 2026-11-02, kimi-k3.1-pro was the only one with neither a wrong
 * channel nor a false return_point. It cannot answer without reasoning, so the vision
 * request bounds that reasoning rather than asking for none.
 *
 * This is its highspeed tier, at twice the price per token. On sixteen evaluation
 * photos, two interleaved rounds each (2026-11-06), both tiers answered 32/32 correctly
 * with identical decisions and token counts, but a highspeed call took p50 7.4s and
 * p90 8.9s against 14.4s and 17.4s, decoding at 91 tokens/s against 39.
 */
export const TOKENHUB_VISION_MODEL = 'kimi-k3.1-pro-highspeed';

export const STRICT_CLASSIFY_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'binwhere_classification',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        item: { type: 'string', minLength: 1 },
        item_kind: { type: 'string', enum: ItemKindSchema.options },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        channel: {
          type: ['string', 'null'],
          enum: [
            'blue_bin',
            'return_point',
            'ewaste',
            'ewaste_battery',
            'lighting',
            'textile',
            'hazardous',
            'bulky_waste',
            'donation',
            'general_waste',
            null,
          ],
        },
        reason: { type: 'string', minLength: 1 },
        preparation: { type: 'array', items: { type: 'string' } },
        tip: { type: 'string' },
      },
      required: ['item', 'item_kind', 'confidence', 'channel', 'reason', 'preparation', 'tip'],
    },
  },
} as const;

export const ACTION_CLASSIFY_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    ...STRICT_CLASSIFY_RESPONSE_FORMAT.json_schema,
    schema: {
      ...STRICT_CLASSIFY_RESPONSE_FORMAT.json_schema.schema,
      properties: {
        ...STRICT_CLASSIFY_RESPONSE_FORMAT.json_schema.schema.properties,
        beverage_evidence: BEVERAGE_EVIDENCE_JSON_SCHEMA,
      },
      required: [...STRICT_CLASSIFY_RESPONSE_FORMAT.json_schema.schema.required, 'beverage_evidence'],
    },
  },
} as const;

/**
 * Text classification is asked to answer without a chain-of-thought.
 *
 * Reasoning tokens bill as output, consume max_tokens, and are the mechanism behind
 * every truncated-JSON defect this classifier has had — while contributing nothing
 * to answer quality here: measured 2026-08-30, 16/16 correct across all four locales
 * with thinking off, at 1.7-3.1s against 5-15s with it on.
 *
 * `thinking` is the spelling TokenHub honours. Probed against hy3 on 2026-08-30:
 * `enable_thinking`, `chat_template_kwargs`, `extra_body` and a `/no_think` prompt
 * suffix were all accepted and silently ignored; only `reasoning_effort: 'none'`
 * behaves the same as this. An unrecognised parameter does not error, so a wrong
 * spelling here would fail silently — which is why logUsage verifies the outcome
 * instead of trusting the send.
 */
export const TOKENHUB_THINKING_DISABLED = { type: 'disabled' } as const;

export const TOKENHUB_TEXT_REQUEST = {
  max_tokens: 1024,
  thinking: TOKENHUB_THINKING_DISABLED,
} as const;

/**
 * The vision model always reasons, so its request bounds that reasoning instead.
 *
 * TokenHub's Kimi guide (updated 2026-10-26) lists the K3 family as reasoning-only:
 * effort is low, high or max, the output cap is `max_completion_tokens`, the
 * temperature is fixed at 1.0 and `thinking` must not be sent. Sent anyway,
 * `thinking: {type:'disabled'}` is accepted and the reasoning then arrives inside
 * `content` (probed 2026-11-02), so this request carries neither `thinking` nor
 * `temperature`. Over 108 calls at low effort the model spent 35–252 reasoning
 * tokens and at most 658 output tokens in all; high effort spent 402–717 and took
 * up to 27s against the 30s attempt. The cap only stops a runaway chain-of-thought
 * from billing without end.
 */
export const TOKENHUB_VISION_REQUEST = {
  reasoning_effort: 'low',
  max_completion_tokens: 8192,
} as const;

interface TokenHubUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
}

interface TokenHubErrorBody {
  error?: {
    message?: unknown;
    code?: unknown;
    request_id?: unknown;
  };
}

interface TokenHubResponseBody {
  choices?: Array<{
    message?: { content?: unknown };
    finish_reason?: string;
  }>;
  usage?: TokenHubUsage;
  error?: unknown;
}

/**
 * A failure worth trying again, as opposed to one that will fail identically.
 *
 * The case this exists for: a model that has been idle answers the first request
 * with `504 504001 upstream response timed out` after ~3.2s, then serves the retry
 * normally. Since this is now the only provider, an un-retried cold start is a 500
 * for whichever user happens to arrive first after a quiet period.
 *
 * Billing and permission failures (400/401/402/403) are deliberately *not* retried:
 * a second identical call cannot fix an exhausted balance or a key without access,
 * and hiding that behind another few seconds of latency only delays the diagnosis.
 */
export class RetryableProviderError extends Error {
  constructor(
    message: string,
    /** Provider-requested delay before the next attempt. */
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'RetryableProviderError';
  }
}

async function requestTokenHubText(
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new RetryableProviderError(`TokenHub request failed: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const message = await formatApiError(res);
    if (res.status >= 500 || res.status === 429) {
      const retryAfterMs = res.status === 429
        ? parseRetryAfterMs(res.headers.get('Retry-After'))
        : res.status === 504 ? 0 : undefined;
      throw new RetryableProviderError(message, retryAfterMs);
    }
    throw new Error(message);
  }

  let data: TokenHubResponseBody;
  try {
    data = await res.json() as TokenHubResponseBody;
  } catch (err) {
    throw new RetryableProviderError(
      `TokenHub returned an invalid response body: ${(err as Error).message}`,
    );
  }
  const choice = data?.choices?.[0];
  if (!choice) {
    throw new RetryableProviderError(
      `TokenHub returned no choices: ${JSON.stringify(data?.error ?? data).slice(0, 200)}`,
    );
  }

  const model = String(body.model ?? 'unknown');
  const thinkingDisabled =
    (body.thinking as { type?: unknown } | undefined)?.type === TOKENHUB_THINKING_DISABLED.type;
  logUsage(model, data?.usage, choice.finish_reason, thinkingDisabled);
  if (choice.finish_reason !== 'stop') {
    // Only an answer the model ended itself is complete. A cut-off one is how the
    // S$0.10 once vanished: the JSON was truncated, not wrong, and nothing said so.
    logEvent('provider_contract', {
      provider: 'tokenhub',
      model,
      issue: 'unfinished_completion',
      finish: choice.finish_reason ?? null,
      out: data?.usage?.completion_tokens,
      reasoning: data?.usage?.completion_tokens_details?.reasoning_tokens,
    });
    throw new RetryableProviderError(
      `TokenHub did not finish the answer (finish_reason=${choice.finish_reason})`,
    );
  }
  const text = choice.message?.content;
  if (typeof text !== 'string') {
    throw new RetryableProviderError('TokenHub returned no text content');
  }
  return text;
}

export class TokenHubProvider implements ClassifyProvider {
  name = 'tokenhub';
  private apiKey: string;
  private options: Required<TokenHubProviderOptions>;

  constructor(apiKey?: string, options: TokenHubProviderOptions = {}) {
    const key = apiKey ?? process.env.TOKENHUB_API_KEY;
    if (!key) throw new Error('TOKENHUB_API_KEY is required');
    this.apiKey = key;
    this.options = {
      getSystemPrompt: options.getSystemPrompt ?? getClassifySystemPrompt,
      imageUserInstruction: options.imageUserInstruction ?? TOKENHUB_IMAGE_USER_INSTRUCTION,
      textTemperature: options.textTemperature ?? 0,
      ensureBcrsRefund: options.ensureBcrsRefund ?? true,
      textModel: options.textModel ?? TOKENHUB_TEXT_MODEL,
      visionModel: options.visionModel ?? TOKENHUB_VISION_MODEL,
      strictResponseSchema: options.strictResponseSchema ?? true,
      enforceNotSurePolicy: options.enforceNotSurePolicy ?? true,
      validateResultSemantics: options.validateResultSemantics ?? true,
      nextActions: options.nextActions ?? true,
    };
  }

  async classify(request: ClassifyRequest, signal?: AbortSignal): Promise<ClassifyResult> {
    const locale = request.locale ?? 'en';
    const langName = LOCALE_LANGUAGE_NAME[locale];
    const model = request.image ? this.options.visionModel : this.options.textModel;

    const textPrompt = request.text
      ? `Classify this item: ${request.text}\n\nRespond in ${langName}.`
      : [
          'What is this item? Classify it for recycling in Singapore.',
          this.options.imageUserInstruction,
          `Respond in ${langName}.`,
        ].filter(Boolean).join(' ');

    // Text-only requests send a plain string rather than a single-element content
    // array. Both shapes are valid OpenAI-compatible input, but only the plain one
    // has been exercised against hy3.
    const userContent = request.image
      ? [
          {
            type: 'image_url' as const,
            image_url: { url: `data:image/jpeg;base64,${request.image}` },
          },
          { type: 'text' as const, text: textPrompt },
        ]
      : textPrompt;

    // Classification follows the prompt's channel rules; it does not sample around
    // them, because a false return_point sends someone to claim a refund that does
    // not exist. The vendor fixes the vision model's temperature, so classifyItem
    // votes over independent image samples instead.
    const sampling = request.image
      ? TOKENHUB_VISION_REQUEST
      : { ...TOKENHUB_TEXT_REQUEST, temperature: this.options.textTemperature };
    const text = await requestTokenHubText(this.apiKey, {
      model,
      messages: [
        { role: 'system', content: this.options.getSystemPrompt(locale, request.image ? 'image' : 'text') },
        { role: 'user', content: userContent },
      ],
      response_format: this.options.strictResponseSchema
        ? (this.options.nextActions ? ACTION_CLASSIFY_RESPONSE_FORMAT : STRICT_CLASSIFY_RESPONSE_FORMAT)
        : { type: 'json_object' },
      ...sampling,
    }, signal);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new RetryableProviderError(
        `TokenHub returned non-JSON response: ${text.slice(0, 200)}`,
      );
    }

    let result: ClassifyResult;
    let itemKind: z.infer<typeof ItemKindSchema>;
    let evidence: z.infer<typeof BeverageEvidenceSchema>;
    try {
      const resultSchema = this.options.validateResultSemantics
        ? ClassifyResultSchema
        : ClassifyResultShapeSchema;
      const raw: unknown = JSON.parse(jsonMatch[0]);
      const { item_kind, ...classification } = withDerivedStatus(raw) as Record<string, unknown>;
      itemKind = ItemKindSchema.parse(item_kind);
      const parsed = resultSchema.parse(classification);
      if (parsed.channel === 'ewaste' && !isEwasteItemKind(itemKind)) {
        throw new Error('ewaste requires an electronic waste item_kind');
      }
      const policySafe = this.options.enforceNotSurePolicy
        ? enforceNotSurePolicy(parsed, locale)
        : parsed;
      if (!this.options.nextActions) {
        return applyItemKindPolicy(this.options.ensureBcrsRefund
          ? ensureBcrsRefundText(policySafe, locale)
          : policySafe, itemKind, locale);
      }
      evidence = BeverageEvidenceSchema.parse((raw as { beverage_evidence: unknown }).beverage_evidence);
      result = policySafe;
    } catch (err) {
      throw new RetryableProviderError(
        `TokenHub returned an invalid classification: ${(err as Error).message}`,
      );
    }

    // Channel safety, actions and their copy are application-owned, never accepted
    // from provider prose.
    const decided = applyBeverageActionPolicy(
      result,
      evidence,
      locale,
      request.image ? 'image' : 'text',
    );
    return ClassifyResultSchema.parse(applyItemKindPolicy(this.options.ensureBcrsRefund
      ? ensureBcrsRefundText(decided, locale)
      : decided, itemKind, locale));
  }
}

/**
 * Status is a function of the channel, so the model is never asked for it.
 *
 * When the model also wrote it, the two could disagree, and every disagreement cost a
 * full retry: one in 73 image cases on 2026-11-06 took 42s that way. A status in the
 * answer now means the provider ignored the response schema, so it is rejected rather
 * than overwritten.
 */
function withDerivedStatus(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw;
  if ('status' in raw) throw new Error('status is derived from the channel; the response schema has none');
  const { channel } = raw as { channel?: unknown };
  const status = channel === null ? 'not_sure'
    : typeof channel === 'string' && Object.hasOwn(CHANNEL_STATUS, channel)
      ? CHANNEL_STATUS[channel as ChannelType]
      : undefined;
  return { ...raw, status };
}

/** A model's own not_sure gets the same application-owned copy as a policy downgrade. */
function enforceNotSurePolicy(result: ClassifyResult, locale: Locale): ClassifyResult {
  return result.status === 'not_sure' ? toUnconfirmed(result, locale) : result;
}

/** BCRS instructions are statutory/product copy and must not be improvised by a model. */
function ensureBcrsRefundText(result: ClassifyResult, locale: Locale): ClassifyResult {
  if (result.channel !== 'return_point') return result;
  return {
    ...result,
    reason: t(locale, 'bcrs.classifyReason'),
    preparation: [
      t(locale, 'bcrs.step1'),
      t(locale, 'bcrs.step2'),
      t(locale, 'bcrs.step3'),
      t(locale, 'bcrs.step4'),
    ],
    tip: t(locale, 'bcrs.refundAmount'),
  };
}

/** TokenHub documents Retry-After as a number of seconds. */
function parseRetryAfterMs(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1_000 : undefined;
}

/** Keep the request id even when the provider's human-readable message is long. */
async function formatApiError(res: Response): Promise<string> {
  const raw = await res.text().catch(() => '');
  let body: TokenHubErrorBody | undefined;
  try {
    body = JSON.parse(raw) as TokenHubErrorBody;
  } catch {
    // The bounded raw body below is still useful if the gateway did not return JSON.
  }

  const error = body?.error;
  const code = typeof error?.code === 'string' || typeof error?.code === 'number'
    ? String(error.code)
    : undefined;
  const detail = typeof error?.message === 'string'
    ? error.message.slice(0, 200)
    : raw.slice(0, 200);
  const requestId = typeof error?.request_id === 'string' ? error.request_id : undefined;

  return [
    `TokenHub API error: ${res.status}`,
    code && `code=${code}`,
    detail,
    requestId && `request_id=${requestId}`,
  ].filter(Boolean).join(' ');
}

/**
 * The only cost telemetry that exists.
 *
 * TokenHub bills post-paid and exposes no cost endpoint — /v1/pricing, /v1/usage
 * and /v1/dashboard/billing/* are all 404, and neither the response body nor its
 * headers carry a price. Unit rates live in the console, so the token counts logged
 * here are the only per-request record from which spend can be reconstructed.
 *
 * Two of the fields earn their place beyond accounting:
 *  - cached_tokens: on the text path the ~1.1k system prompt is identical on every
 *    call and the gateway caches it automatically — measured 896-1024 of 1109, so
 *    input is close to free after the first request. If that collapses to zero,
 *    input cost has quietly multiplied. On the image path only the prompt before
 *    the photo can be shared — 48% of input across 108 kimi-k3.1-pro calls on
 *    2026-11-02 — so image input cost must be read from every response.
 *  - reasoning_tokens: billed as output whether or not anything reads them, and the
 *    mechanism behind every truncated-JSON defect this classifier has had. A request
 *    that disables thinking asks for none, so any nonzero reading there is the
 *    provider overriding us. The vision model always reasons; low effort and the
 *    output cap bound it, and this count is the record of what it spent.
 */
function logUsage(
  model: string,
  usage: TokenHubUsage | undefined,
  finishReason: string | undefined,
  thinkingDisabled: boolean,
) {
  if (!usage) return;
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const reasoning = usage.completion_tokens_details?.reasoning_tokens ?? 0;
  console.info(
    `[ai] tokenhub ${model} in=${usage.prompt_tokens} (cached ${cached}) out=${usage.completion_tokens}` +
      ` reasoning=${reasoning} finish=${finishReason}`,
  );
  if (thinkingDisabled && reasoning > 0) {
    console.warn(`[ai] ${model} spent ${reasoning} reasoning tokens — it is billed as output and eats max_tokens`);
    // The request set TOKENHUB_THINKING_DISABLED, so a nonzero count is the provider
    // declining it: a silent vendor-side change to a model chosen *because* it did
    // not think. This same console.warn already existed on 2026-08-29 and recorded
    // the regression faithfully — nobody read it, and a user ate a 500 for a day.
    // So it also goes to the event stream every other API outcome lands in, where
    // one `grep '"evt":"provider_contract"'` answers "is this still true?".
    logEvent('provider_contract', {
      provider: 'tokenhub',
      model,
      issue: 'reasoning_not_disabled',
      reasoning,
      out: usage.completion_tokens,
      finish: finishReason ?? null,
      expectedReasoning: 0,
    });
  }
}
