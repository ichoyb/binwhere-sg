import { ClassifyResultSchema, type ClassifyProvider, type ClassifyRequest, type ClassifyResult, type ProviderType } from './types';
import { GeminiProvider } from './providers/gemini';
import { AnthropicProvider } from './providers/anthropic';

/** Create a provider by type */
function createProvider(type: ProviderType): ClassifyProvider {
  switch (type) {
    case 'gemini':
      return new GeminiProvider();
    case 'anthropic':
      return new AnthropicProvider();
    default:
      throw new Error(`Unknown provider: ${type}`);
  }
}

/** Promise with timeout */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/**
 * Classify an item with automatic fallback.
 * Primary: env.AI_PROVIDER (default: gemini)
 * Fallback: anthropic (if primary is gemini) or gemini (if primary is anthropic)
 */
export async function classifyItem(request: ClassifyRequest): Promise<ClassifyResult> {
  const primaryType = (process.env.AI_PROVIDER as ProviderType) || 'gemini';
  const fallbackType: ProviderType = primaryType === 'gemini' ? 'anthropic' : 'gemini';

  // Try primary provider
  try {
    const primary = createProvider(primaryType);
    const result = await withTimeout(primary.classify(request), 8000);
    return ClassifyResultSchema.parse(result);
  } catch (err) {
    console.warn(`[ai] Primary provider (${primaryType}) failed:`, (err as Error).message);
  }

  // Try fallback provider
  try {
    const fallback = createProvider(fallbackType);
    const result = await withTimeout(fallback.classify(request), 10000);
    return ClassifyResultSchema.parse(result);
  } catch (err) {
    console.warn(`[ai] Fallback provider (${fallbackType}) failed:`, (err as Error).message);
  }

  // Both failed — return safe default
  return {
    item: request.text || 'unknown',
    status: 'not_sure',
    confidence: 0,
    channel: null,
    reason: 'AI service temporarily unavailable. Please try again.',
  };
}
