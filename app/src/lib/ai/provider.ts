import { ClassifyResultSchema, type ClassifyProvider, type ClassifyRequest, type ClassifyResult } from './types';
import { GroqClassifyProvider } from './providers/groq-classify';
import { OpenRouterProvider } from './providers/openrouter';

interface ChainEntry {
  name: string;
  create: () => ClassifyProvider;
  /** Budget for one attempt. Images cost more: bigger upload, sometimes extra calls. */
  timeoutMs: (request: ClassifyRequest) => number;
}

/**
 * Fallback chain: Groq → OpenRouter.
 *
 * Pollinations was removed rather than demoted. Its key has had a zero budget for
 * some time and it answered 402 to every request, including anonymous ones, so it
 * contributed nothing but delay on the way to an error — and because nothing
 * exercised it, its death went unnoticed until Groq's vision model was
 * decommissioned and took the whole endpoint down with it. A fallback that is
 * never checked is not a fallback.
 *
 * Order note: Groq leads on latency (~1-2.6s vs ~8-10s) and answered every test
 * photo, but its vision model is Preview-tier and can be withdrawn without notice.
 * OpenRouter's free models survive longer but are shared capacity — measured
 * upstream 429s and one model stalling past 120s on a real photo. Keeping the
 * fragile-but-fast provider first means its eventual disappearance is loud and
 * harmless (every request logs a fallback) instead of silent.
 */
const FALLBACK_CHAIN: ChainEntry[] = [
  {
    name: 'groq',
    create: () => new GroqClassifyProvider(),
    // An image classify is two sequential calls (vision, then translation for
    // non-English locales) on top of the upload; at 10s it returned a hard 500.
    timeoutMs: (r) => (r.image ? 25000 : 10000),
  },
  {
    name: 'openrouter',
    create: () => new OpenRouterProvider(),
    // Free models are shared capacity and run slower; generous, but bounded well
    // below the 120s+ stall observed from one of them.
    timeoutMs: (r) => (r.image ? 35000 : 20000),
  },
];

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
 * Classify an item, falling through the chain on failure.
 */
export async function classifyItem(request: ClassifyRequest): Promise<ClassifyResult> {
  for (const [index, entry] of FALLBACK_CHAIN.entries()) {
    try {
      const provider = entry.create();
      const result = await withTimeout(provider.classify(request), entry.timeoutMs(request));
      if (index > 0) {
        // Running on a fallback means the provider above it is broken. Say so.
        console.warn(`[ai] Served by fallback provider (${entry.name}) — ${FALLBACK_CHAIN[0].name} is failing`);
      }
      return ClassifyResultSchema.parse(result);
    } catch (err) {
      console.warn(`[ai] Provider (${entry.name}) failed:`, (err as Error).message);
    }
  }

  throw new Error('AI service temporarily unavailable. Please try again.');
}
