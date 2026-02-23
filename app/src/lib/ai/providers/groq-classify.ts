import Groq from 'groq-sdk';
import { ClassifyResultSchema, type ClassifyProvider, type ClassifyRequest, type ClassifyResult } from '../types';
import { CLASSIFY_SYSTEM_PROMPT } from '../prompts/classify-system';

/** Text model for text-only classification */
const TEXT_MODEL = 'llama-3.3-70b-versatile';
/** Vision model for image classification (Llama 4 Scout replaces deprecated 3.2 11B) */
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

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

    const content: Groq.Chat.Completions.ChatCompletionContentPart[] = [];

    if (request.image) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${request.image}` },
      });
    }

    const textPrompt = request.text
      ? `Classify this item: ${request.text}`
      : 'What is this item? Classify it for recycling in Singapore. Respond in English.';
    content.push({ type: 'text', text: textPrompt });

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      max_tokens: 1024,
    });

    const text = response.choices[0]?.message?.content ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Groq returned non-JSON response: ${text.slice(0, 200)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return ClassifyResultSchema.parse(parsed);
  }
}
