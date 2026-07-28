import { ClassifyResultSchema, type ClassifyProvider, type ClassifyRequest, type ClassifyResult } from '../types';
import { getClassifySystemPrompt } from '../prompts/classify-system';
import { LOCALE_LANGUAGE_NAME } from '@/lib/i18n';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Free vision models, tried in this order by OpenRouter itself via the `models`
 * array — if one is rate-limited upstream or stalls, OpenRouter moves to the next
 * within the same request.
 *
 * That routing is the point of this provider. Measured individually against real
 * photos: nemotron is the fastest (~4.5s) but hung for 123s on a pizza box three
 * times running; gemma-4-31b returned upstream 429s on a third of calls; only
 * gemma-4-26b answered every time, at ~19s alone. Chained through `models` all
 * three test photos came back correct in 7.8-10.5s.
 */
const MODEL_CHAIN = [
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
];

/**
 * OpenRouter classify provider.
 *
 * Unlike the Groq path this needs no translation step — these models emit the
 * target language directly, so a localised classify is one call rather than two.
 */
export class OpenRouterProvider implements ClassifyProvider {
  name = 'openrouter';
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OPENROUTER_API_KEY is required');
    this.apiKey = key;
  }

  async classify(request: ClassifyRequest): Promise<ClassifyResult> {
    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } };

    const locale = request.locale ?? 'en';
    const langName = LOCALE_LANGUAGE_NAME[locale];
    const content: ContentPart[] = [];

    if (request.image) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${request.image}` },
      });
    }

    const textPrompt = request.text
      ? `Classify this item: ${request.text}\n\nRespond in ${langName}.`
      : `What is this item? Classify it for recycling in Singapore. Respond in ${langName}.`;
    content.push({ type: 'text', text: textPrompt });

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        // OpenRouter attributes traffic by these; they are not authentication.
        'HTTP-Referer': 'https://binwhere.sg',
        'X-Title': 'BinWhere',
      },
      body: JSON.stringify({
        model: MODEL_CHAIN[0],
        models: MODEL_CHAIN,
        messages: [
          { role: 'system', content: getClassifySystemPrompt(locale) },
          { role: 'user', content },
        ],
        max_tokens: 1024,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`OpenRouter API error: ${res.status} ${detail.slice(0, 200)}`);
    }

    const data = await res.json();

    // OpenRouter reports upstream failures as an error object inside a 200 response,
    // so a bad status is not enough to detect them.
    if (!data.choices?.length) {
      throw new Error(`OpenRouter returned no choices: ${JSON.stringify(data.error ?? data).slice(0, 200)}`);
    }

    // Which model actually served this matters when diagnosing latency or quality.
    console.info(`[ai] OpenRouter served by ${data.model}`);

    const text = data.choices[0]?.message?.content ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`OpenRouter returned non-JSON response: ${text.slice(0, 200)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return ClassifyResultSchema.parse(parsed);
  }
}
