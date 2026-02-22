import Groq from 'groq-sdk';
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'groq-sdk/resources/chat';

/**
 * Groq provider for V1 Chatbox (tool_use).
 * Uses Llama 3.3 70B for tool calling with free tier (1K req/day).
 * Classification is NOT done through Groq — only chatbox conversations.
 */
export class GroqChatProvider {
  name = 'groq';
  private client: Groq;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY is required');
    this.client = new Groq({ apiKey: key });
  }

  /**
   * Send a chat message with optional tool definitions.
   * Used for chatbox feature and Phase 0 tool calling tests.
   */
  async chat(
    messages: ChatCompletionMessageParam[],
    tools?: ChatCompletionTool[],
    systemPrompt?: string,
  ): Promise<ChatCompletion> {
    const allMessages: ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      allMessages.push({ role: 'system', content: systemPrompt });
    }
    allMessages.push(...messages);

    return this.client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: allMessages,
      tools: tools?.length ? tools : undefined,
      tool_choice: tools?.length ? 'auto' : undefined,
      max_tokens: 1024,
    });
  }
}
