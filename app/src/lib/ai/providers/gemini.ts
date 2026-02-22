import { GoogleGenerativeAI } from '@google/generative-ai';
import { ClassifyResultSchema, type ClassifyProvider, type ClassifyRequest, type ClassifyResult } from '../types';
import { CLASSIFY_SYSTEM_PROMPT } from '../prompts/classify-system';

export class GeminiProvider implements ClassifyProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is required');
    this.client = new GoogleGenerativeAI(key);
  }

  async classify(request: ClassifyRequest): Promise<ClassifyResult> {
    const model = this.client.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: CLASSIFY_SYSTEM_PROMPT,
    });

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (request.image) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: request.image,
        },
      });
    }

    const textPrompt = request.text
      ? `Classify this item: ${request.text}`
      : 'What is this item? Classify it for recycling in Singapore.';
    parts.push({ text: textPrompt });

    const result = await model.generateContent(parts);
    const text = result.response.text();

    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Gemini returned non-JSON response: ${text.slice(0, 200)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return ClassifyResultSchema.parse(parsed);
  }
}
