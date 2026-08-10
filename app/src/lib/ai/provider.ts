import { ClassifyResultSchema, type ClassifyProvider, type ClassifyRequest, type ClassifyResult } from './types';
import { RetryableProviderError, TokenHubProvider } from './providers/tokenhub';

/**
 * TokenHub is the only classify provider.
 *
 * The previous Groq → OpenRouter chain is gone, and the reasoning is worth keeping
 * because it inverts the usual argument for redundancy. Groq's only image-capable
 * model was Preview-tier — withdrawable without notice, and it had already taken
 * the endpoint down once — while the OpenRouter fallback behind it had itself
 * decayed to timing out on two of three real requests. Two providers that each
 * expire on their own schedule is not availability; it is two things to discover
 * broken. TokenHub runs on a paid account against models the account actually owns,
 * so the failure mode is a bill, not a silent decommissioning.
 *
 * What replaces the fallback is a retry, and a deadline that bounds it.
 */

/** How long one attempt may run before it is abandoned. */
export const ATTEMPT_MS = (request: ClassifyRequest) => (request.image ? 15_000 : 8_000);

/**
 * How long the whole classify may run, retries included.
 *
 * The client does not repeat a completed classification failure, so this bounds all
 * provider work for one request. End-to-end latency also includes request upload and
 * image sanitisation. Measured provider latencies are 1.9-4.4s for text and 3.7-7.1s
 * for a photo, so one attempt has roughly double the headroom it needs and the budget
 * still covers a second.
 */
export const BUDGET_MS = (request: ClassifyRequest) => (request.image ? 32_000 : 20_000);

/** Below this there is not enough of the budget left for an attempt to be worth starting. */
const MIN_ATTEMPT_MS = 3_000;

const MAX_ATTEMPTS = 3;

/** Short exponential backoff for transient failures without a provider delay. */
const RETRY_BACKOFF_MS = 500;

/**
 * Run one attempt, abandoning it at `ms` and aborting the underlying request.
 *
 * The abort matters: a timeout that only stops *waiting* leaves the socket and the
 * upstream generation running, so a slow provider accumulates in-flight work behind
 * every request that gave up on it.
 */
async function attempt(
  provider: ClassifyProvider,
  request: ClassifyRequest,
  ms: number,
): Promise<ClassifyResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await provider.classify(request, controller.signal);
  } catch (err) {
    if (controller.signal.aborted) {
      throw new RetryableProviderError(`Timeout after ${ms}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Classify an item, retrying transient failures until the budget is spent.
 *
 * The retry is not defensive padding — it covers a specific, reproduced behaviour:
 * a model that has been idle answers the first request with `504 504001` after
 * ~3.2s and serves the next one normally. With no second provider left to absorb
 * that, an un-retried cold start is a 500 for the first user after a quiet period,
 * and BinWhere's traffic is quiet enough for that to be the common case rather than
 * the rare one.
 */
export async function classifyItem(
  request: ClassifyRequest,
  // Injectable so the retry policy can be tested without a live provider. This is
  // the code that only ever runs when something is already broken, so leaving it
  // unexercised repeats the mistake that let the old fallback rot unnoticed.
  provider: ClassifyProvider = new TokenHubProvider(),
): Promise<ClassifyResult> {
  const deadline = Date.now() + BUDGET_MS(request);
  let lastError: Error | undefined;

  for (let n = 1; n <= MAX_ATTEMPTS; n += 1) {
    const remaining = deadline - Date.now();
    if (n > 1 && remaining < MIN_ATTEMPT_MS) break;

    try {
      const result = await attempt(provider, request, Math.min(ATTEMPT_MS(request), remaining));
      if (n > 1) {
        // A retry that succeeds still means the first call failed. Say so, or the
        // provider degrades invisibly until it degrades past the budget too.
        console.warn(`[ai] Classify succeeded on attempt ${n} — previous attempt failed: ${lastError?.message}`);
      }
      return ClassifyResultSchema.parse(result);
    } catch (err) {
      lastError = err as Error;
      if (!(err instanceof RetryableProviderError)) {
        // A bad key, an exhausted balance, a model the account cannot call: retrying
        // cannot change the answer, and pretending otherwise buries the real cause.
        console.error(`[ai] Classify failed permanently: ${lastError.message}`);
        break;
      }
      console.warn(`[ai] Classify attempt ${n} failed: ${lastError.message}`);

      if (n < MAX_ATTEMPTS) {
        const delayMs = err.retryAfterMs ?? RETRY_BACKOFF_MS * (2 ** (n - 1));
        const remainingAfterFailure = deadline - Date.now();
        if (delayMs + MIN_ATTEMPT_MS > remainingAfterFailure) {
          console.warn(
            `[ai] Retry skipped: ${remainingAfterFailure}ms remains, but the next attempt needs ` +
              `${delayMs}ms delay plus ${MIN_ATTEMPT_MS}ms to run`,
          );
          break;
        }
        if (delayMs > 0) {
          console.warn(`[ai] Retrying classify in ${delayMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
  }

  throw new Error('AI service temporarily unavailable. Please try again.');
}
