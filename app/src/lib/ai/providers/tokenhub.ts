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

const API_URL = 'https://tokenhub.tencentmaas.com/v1/chat/completions';

export const TOKENHUB_IMAGE_USER_INSTRUCTION =
  'For a plastic or metal beverage container, including a bottle, can or cup: inspect the label around the product barcode at every orientation, including sideways or upside down. Use return_point only when exactly one container is the clear subject, the official circular-arrow mark is distinguishable as "10¢ SG RETURN", and a separate linear EAN product barcode is visibly present and unobscured on that same container, unless the container is visibly crushed or the barcode is visibly damaged. Exactly one clear subject means one intended foreground container; incidental out-of-focus background containers do not disqualify it. Treat the image as multiple-container ambiguity only when two or more containers are plausible co-equal subjects. Read both "SG" and "RETURN" directly from the submitted pixels: never reconstruct blurred characters from the familiar circular-arrow logo layout. Small text counts as direct pixel evidence when its letter shapes remain visually distinguishable after careful inspection; "too small" means the letters cannot actually be distinguished, not merely that the mark occupies a small part of the image. The circular-arrow 10¢ shape or return-machine context alone is insufficient; if either SG or RETURN is blurred or only inferred, use not_sure. The barcode digits need not be decoded from the photo, and emptying is a preparation step; the Return Point performs the final scan. A square 2D traceability code on a BCRS sticker is separate from the product barcode and cannot substitute for it; if only the square code is visible, use not_sure. "Product of" text and certification logos describe the product, not the deposit scheme: a container made outside Singapore is still eligible when its mark visibly reads "SG RETURN". For multiple plausible subjects, outer packaging, an ambiguous or foreign mark, or a hidden product barcode, use not_sure with channel null and confidence below 0.5; ask for a clear label photo and do not mention blue_bin.';

export interface TokenHubProviderOptions {
  getSystemPrompt?: typeof getClassifySystemPrompt;
  imageUserInstruction?: string;
  textTemperature?: number;
  visionTemperature?: number;
  ensureBcrsRefund?: boolean;
  textModel?: string;
  visionModel?: string;
  strictResponseSchema?: boolean;
  enforceNotSurePolicy?: boolean;
  validateResultSemantics?: boolean;
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
 * Image classification. The single-image Kimi K2.6 candidate passed the v16 gate:
 * 48/48 overall, 36/36 image assertions, 12/12 return-point recall, and both fresh
 * holdouts, with no false return-point directions, blue-bin leaks, or provider errors.
 * An earlier v15 run missed one small but human-readable mark. Detail-tile experiments
 * recovered it but created unsafe false return-point directions, so the single-image
 * path is retained. TokenHub requires temperature 0.6 with K2.6 thinking disabled;
 * occasional responses still report one reasoning token and are logged as contract
 * events, but the v16 run had no truncation or invalid measurement.
 */
export const TOKENHUB_VISION_MODEL = 'kimi-k2.6';

export const TOKENHUB_MAX_TOKENS = 1024;

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
        status: {
          type: 'string',
          enum: ['recyclable', 'special_handling', 'consider_donating', 'not_recyclable', 'not_sure'],
        },
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
      required: ['item', 'status', 'confidence', 'channel', 'reason', 'preparation', 'tip'],
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
      visionTemperature: options.visionTemperature ?? 0.6,
      ensureBcrsRefund: options.ensureBcrsRefund ?? true,
      textModel: options.textModel ?? TOKENHUB_TEXT_MODEL,
      visionModel: options.visionModel ?? TOKENHUB_VISION_MODEL,
      strictResponseSchema: options.strictResponseSchema ?? true,
      enforceNotSurePolicy: options.enforceNotSurePolicy ?? true,
      validateResultSemantics: options.validateResultSemantics ?? true,
    };
  }

  async classify(request: ClassifyRequest, signal?: AbortSignal): Promise<ClassifyResult> {
    const locale = request.locale ?? 'en';
    const langName = LOCALE_LANGUAGE_NAME[locale];
    const model = request.image ? this.options.visionModel : this.options.textModel;
    const temperature = request.image
      ? this.options.visionTemperature
      : this.options.textTemperature;

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

    let res: Response;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: this.options.getSystemPrompt(locale) },
            { role: 'user', content: userContent },
          ],
          max_tokens: TOKENHUB_MAX_TOKENS,
          // Classification follows the prompt's channel rules; it does not sample
          // around them. A false return_point sends someone to claim a refund that
          // does not exist.
          temperature,
          response_format: this.options.strictResponseSchema
            ? STRICT_CLASSIFY_RESPONSE_FORMAT
            : { type: 'json_object' },
          thinking: TOKENHUB_THINKING_DISABLED,
        }),
      });
    } catch (err) {
      // Transport-level failures (DNS, reset, abort) are all worth one retry; the
      // orchestrator decides whether the deadline still allows it.
      throw new RetryableProviderError(`TokenHub request failed: ${(err as Error).message}`);
    }

    if (!res.ok) {
      const message = await formatApiError(res);
      if (res.status >= 500 || res.status === 429) {
        const retryAfterMs = res.status === 429
          ? parseRetryAfterMs(res.headers.get('Retry-After'))
          // A reproduced cold-model 504 succeeds immediately on the next call.
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

    logUsage(model, data?.usage, choice.finish_reason);

    const text = choice.message?.content;
    if (typeof text !== 'string') {
      throw new RetryableProviderError(
        `TokenHub returned no text content (finish_reason=${choice.finish_reason})`,
      );
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // finish_reason is the tell: 'length' means the answer was cut off rather
      // than malformed, which is a model or max_tokens problem, not a parse bug.
      throw new RetryableProviderError(
        `TokenHub returned non-JSON response (finish_reason=${choice.finish_reason}): ${text.slice(0, 200)}`,
      );
    }

    try {
      const resultSchema = this.options.validateResultSemantics
        ? ClassifyResultSchema
        : ClassifyResultShapeSchema;
      const parsed = resultSchema.parse(JSON.parse(jsonMatch[0]));
      const policySafe = this.options.enforceNotSurePolicy
        ? enforceNotSurePolicy(parsed, locale)
        : parsed;
      return this.options.ensureBcrsRefund
        ? ensureBcrsRefundText(policySafe, locale)
        : policySafe;
    } catch (err) {
      throw new RetryableProviderError(
        `TokenHub returned an invalid classification: ${(err as Error).message}`,
      );
    }
  }
}

/**
 * `not_sure` means the application has not established any disposal channel.
 * Model prose is not allowed to weaken that structured decision with a suggested
 * channel, so uncertainty copy is owned by the application in every locale.
 */
function enforceNotSurePolicy(result: ClassifyResult, locale: Locale): ClassifyResult {
  if (result.status !== 'not_sure') return result;
  return {
    ...result,
    confidence: Math.min(result.confidence, 0.49),
    channel: null,
    reason: t(locale, 'classify.notSureReason'),
    preparation: [t(locale, 'classify.notSurePreparation')],
    tip: undefined,
  };
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
 *    input cost has quietly multiplied. It reads 0 on the image path and always
 *    has: the photo is part of the prompt, so no two image requests share a
 *    prefix, so image input cost must be read from every response.
 *  - reasoning_tokens: billed as output whether or not anything reads them, and the
 *    mechanism behind every truncated-JSON defect this classifier has had. The
 *    request asks for none, so any nonzero reading is the provider overriding us.
 */
function logUsage(
  model: string,
  usage: TokenHubUsage | undefined,
  finishReason: string | undefined,
) {
  if (!usage) return;
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const reasoning = usage.completion_tokens_details?.reasoning_tokens ?? 0;
  console.info(
    `[ai] tokenhub ${model} in=${usage.prompt_tokens} (cached ${cached}) out=${usage.completion_tokens}` +
      ` reasoning=${reasoning} finish=${finishReason}`,
  );
  if (reasoning > 0) {
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
    });
  }
}
