import Anthropic from '@anthropic-ai/sdk';
import { ClassifyResultSchema, type ClassifyProvider, type ClassifyRequest, type ClassifyResult } from '../types';
import { CLASSIFY_SYSTEM_PROMPT } from '../prompts/classify-system';

export class AnthropicProvider implements ClassifyProvider {
  name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is required');
    this.client = new Anthropic({ apiKey: key });
  }

  async classify(request: ClassifyRequest): Promise<ClassifyResult> {
    const content: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

    if (request.image) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: request.image,
        },
      });
    }

    const textPrompt = request.text
      ? `Classify this item: ${request.text}`
      : 'What is this item? Classify it for recycling in Singapore.';
    content.push({ type: 'text', text: textPrompt });

    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: CLASSIFY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Anthropic returned non-JSON response: ${text.slice(0, 200)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return ClassifyResultSchema.parse(parsed);
  }
}
