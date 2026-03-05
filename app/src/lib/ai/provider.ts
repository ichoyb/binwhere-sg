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

/** Get provider chain based on request — skip Groq vision for non-English (poor multilingual output) */
function getProviderChain(request: ClassifyRequest): ProviderType[] {
  const isNonEnImage = !!request.image && (request.locale ?? 'en') !== 'en';
  if (isNonEnImage) {
    return ['pollinations'];
  }
  return FALLBACK_CHAIN;
}

/**
 * Classify an item with automatic fallback.
 * Chain: Groq → Pollinations (non-English image: Pollinations only)
 */
export async function classifyItem(request: ClassifyRequest): Promise<ClassifyResult> {
  for (const providerType of getProviderChain(request)) {
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
