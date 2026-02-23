import { ClassifyResultSchema, type ClassifyProvider, type ClassifyRequest, type ClassifyResult, type ProviderType } from './types';
import { GroqClassifyProvider } from './providers/groq-classify';
import { PollinationsProvider } from './providers/pollinations';

/** Create a provider by type */
function createProvider(type: ProviderType): ClassifyProvider {
  switch (type) {
    case 'groq':
      return new GroqClassifyProvider();
    case 'pollinations':
      return new PollinationsProvider();
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

/** Fallback chain */
const FALLBACK_CHAIN: ProviderType[] = ['groq', 'pollinations'];

/**
 * Classify an item with automatic fallback.
 * Chain: Groq → Pollinations
 */
export async function classifyItem(request: ClassifyRequest): Promise<ClassifyResult> {
  for (const providerType of FALLBACK_CHAIN) {
    try {
      const provider = createProvider(providerType);
      const timeout = providerType === 'groq' ? 10000 : 20000;
      const result = await withTimeout(provider.classify(request), timeout);
      return ClassifyResultSchema.parse(result);
    } catch (err) {
      console.warn(`[ai] Provider (${providerType}) failed:`, (err as Error).message);
    }
  }

  throw new Error('AI service temporarily unavailable. Please try again.');
}
