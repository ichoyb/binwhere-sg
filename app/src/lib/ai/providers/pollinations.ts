import { ClassifyResultSchema, type ClassifyProvider, type ClassifyRequest, type ClassifyResult } from '../types';
import { CLASSIFY_SYSTEM_PROMPT } from '../prompts/classify-system';

const API_URL = 'https://text.pollinations.ai/openai';
const MODEL = 'openai';

export class PollinationsProvider implements ClassifyProvider {
  name = 'pollinations';
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.POLLINATIONS_API_KEY;
  }

  async classify(request: ClassifyRequest): Promise<ClassifyResult> {
    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } };

    const content: ContentPart[] = [];

    if (request.image) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${request.image}` },
      });
    }

    const textPrompt = request.text
      ? `Classify this item: ${request.text}`
      : 'What is this item? Classify it for recycling in Singapore.';
    content.push({ type: 'text', text: textPrompt });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error(`Pollinations API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Pollinations returned non-JSON response: ${text.slice(0, 200)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return ClassifyResultSchema.parse(parsed);
  }
}
