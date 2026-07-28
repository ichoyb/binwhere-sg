import Groq from 'groq-sdk';
import { ClassifyResultSchema, type ClassifyProvider, type ClassifyRequest, type ClassifyResult } from '../types';
import { getClassifySystemPrompt } from '../prompts/classify-system';
import { LOCALE_LANGUAGE_NAME } from '@/lib/i18n';

/**
 * Text model for text-only classification and for translating image results.
 * llama-3.3-70b-versatile shuts down 2026-08-16; this is Groq's recommended
 * replacement and, unlike the vision model, it is a Production-tier model.
 * It emits reasoning into a separate `reasoning` field, so `content` stays
 * clean JSON and needs no reasoning_effort override.
 */
const TEXT_MODEL = 'openai/gpt-oss-120b';
/**
 * Vision model for image classification.
 * Groq has now decommissioned every Llama vision model (3.2 11B, then Llama 4
 * Scout/Maverick); qwen3.6 is the only image-capable model left on the account.
 */
const VISION_MODEL = 'qwen/qwen3.6-27b';

export class GroqClassifyProvider implements ClassifyProvider {
  name = 'groq';
  private client: Groq;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY is required');
    this.client = new Groq({ apiKey: key });
  }

  async classify(request: ClassifyRequest): Promise<ClassifyResult> {
    const hasImage = !!request.image;
    const model = hasImage ? VISION_MODEL : TEXT_MODEL;
    const locale = request.locale ?? 'en';
    const langName = LOCALE_LANGUAGE_NAME[locale];

    // Vision model has poor non-English output — classify in English, then translate
    const needsTranslation = hasImage && locale !== 'en';
    const classifyLocale = needsTranslation ? 'en' : locale;
    const classifyLang = needsTranslation ? 'English' : langName;

    const content: Groq.Chat.Completions.ChatCompletionContentPart[] = [];

    if (request.image) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${request.image}` },
      });
    }

    const textPrompt = request.text
      ? `Classify this item: ${request.text}\n\nRespond in ${classifyLang}.`
      : `What is this item? Classify it for recycling in Singapore. Respond in ${classifyLang}.`;
    content.push({ type: 'text', text: textPrompt });

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: getClassifySystemPrompt(classifyLocale) },
        { role: 'user', content },
      ],
      max_tokens: 1024,
      // Classification must follow the prompt's channel rules, not sample around them.
      // At the API default the same photo alternated between blue_bin and return_point,
      // which sends users to a Return Point for a refund they cannot claim.
      temperature: 0.3,
      // The vision model is a reasoning model: left on its own it spends the whole
      // token budget on a <think> block and never reaches the JSON. Turning reasoning
      // off and pinning JSON output keeps the response parseable.
      ...(hasImage
        ? {
            reasoning_effort: 'none' as const,
            response_format: { type: 'json_object' as const },
          }
        : {}),
    });

    const text = response.choices[0]?.message?.content ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Groq returned non-JSON response: ${text.slice(0, 200)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const result = ClassifyResultSchema.parse(parsed);

    if (needsTranslation) {
      return this.translateResult(result, langName);
    }
    return result;
  }

  /** Translate text fields from English to target language using the text model */
  private async translateResult(result: ClassifyResult, langName: string): Promise<ClassifyResult> {
    const fields = {
      item: result.item,
      reason: result.reason,
      ...(result.preparation && { preparation: result.preparation }),
      ...(result.tip && { tip: result.tip }),
    };

    const response = await this.client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: `Translate the following JSON values to ${langName}. Return ONLY valid JSON with the same keys. Keep translations concise and practical. Copy currency amounts, numbers and units verbatim (e.g. "S$0.10", "150ml-3L") — never convert them to another currency, unit or numeral system.`,
        },
        { role: 'user', content: JSON.stringify(fields) },
      ],
      max_tokens: 512,
      // Translation should transcribe, not paraphrase — this is where S$0.10 drifted to 美分.
      temperature: 0.2,
    });

    const text = response.choices[0]?.message?.content ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return result; // translation failed, return English result
    }

    try {
      const translated = JSON.parse(jsonMatch[0]);
      return {
        ...result,
        item: translated.item || result.item,
        reason: translated.reason || result.reason,
        preparation: translated.preparation || result.preparation,
        tip: translated.tip || result.tip,
      };
    } catch {
      return result; // parse failed, return English result
    }
  }
}
