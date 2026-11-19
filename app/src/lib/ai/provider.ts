import {
  ClassifyResultSchema,
  ClassifyResultShapeSchema,
  type ClassifyProvider,
  type ClassifyRequest,
  type ClassifyResult,
} from './types';
import { RetryableProviderError, TokenHubProvider } from './providers/tokenhub';
import { toUnconfirmed } from '@binwhere/core';

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

export interface ClassificationExecutionPolicy {
  textAttemptMs: number;
  imageAttemptMs: number;
  textBudgetMs: number;
  imageBudgetMs: number;
  minAttemptMs: number;
  maxAttempts: number;
  retryBackoffMs: number;
  validateResultSemantics: boolean;
}

/**
 * Runtime policy used by the source-bound candidate and, once deployed, production.
 *
 * Text timings come from the international endpoint (86 calls without a timeout,
 * 2026-10-26): about 2s to the first token, then 64 tokens/s for 180–230 output
 * tokens; p95 7.3s, slowest 9.6s. Slow calls arrive in bursts, not with particular
 * items: two items that timed out twice in a row at 8s answered in under 5s fifteen
 * minutes later. A 12s attempt covers that tail, and the 25s budget fits a second
 * full attempt.
 *
 * One image sample is one vision call. The highspeed tier in use took p50 7.4s, p90
 * 8.9s and at most 9.2s over 32 calls (2026-11-06); the standard tier took p50 13.0s,
 * p90 16.1s and at most 20.6s over 108 (2026-11-02). Only 32 highspeed calls have been
 * seen, so the attempt stays at 30s, which also covers the standard tier's slowest.
 */
export const DEFAULT_EXECUTION_POLICY: ClassificationExecutionPolicy = {
  textAttemptMs: 12_000,
  imageAttemptMs: 30_000,
  textBudgetMs: 25_000,
  imageBudgetMs: 50_000,
  minAttemptMs: 3_000,
  maxAttempts: 3,
  retryBackoffMs: 500,
  validateResultSemantics: true,
};

/** How long one attempt may run before it is abandoned. */
export const ATTEMPT_MS = (
  request: ClassifyRequest,
  policy: ClassificationExecutionPolicy = DEFAULT_EXECUTION_POLICY,
) => (request.image ? policy.imageAttemptMs : policy.textAttemptMs);

/**
 * How long the whole classify may run, retries included.
 *
 * The client does not repeat a completed classification failure, so this bounds all
 * provider work for one request. End-to-end latency also includes request upload and
 * image sanitisation. The native client sets no request timeout, and React Native on
 * iOS sends through a default URLSession configuration, whose request timeout is 60s.
 * An answer later than that reaches the user as a dropped connection rather than a
 * classification failure, so the image budget stays at 50s. That leaves a 20s second
 * attempt after a timed-out first one, enough for a typical image, and a full second
 * attempt after a fast failure such as the cold-start 504. The same budget bounds the
 * majority vote, whose samples all run in parallel.
 */
export const BUDGET_MS = (
  request: ClassifyRequest,
  policy: ClassificationExecutionPolicy = DEFAULT_EXECUTION_POLICY,
) => (request.image ? policy.imageBudgetMs : policy.textBudgetMs);

/**
 * Run one attempt, abandoning it at `ms` and aborting the underlying request.
 *
 * The abort matters: a timeout that only stops *waiting* leaves the socket and the
 * upstream generation running, so a slow provider accumulates in-flight work behind
 * every request that gave up on it. `cancel` stops the attempt early once its answer
 * is no longer needed.
 */
async function attempt(
  provider: ClassifyProvider,
  request: ClassifyRequest,
  ms: number,
  cancel?: AbortSignal,
): Promise<ClassifyResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const stop = () => controller.abort();
  cancel?.addEventListener('abort', stop);
  try {
    return await provider.classify(request, controller.signal);
  } catch (err) {
    if (controller.signal.aborted) {
      throw new RetryableProviderError(`Timeout after ${ms}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    cancel?.removeEventListener('abort', stop);
  }
}

const validate = (result: ClassifyResult, policy: ClassificationExecutionPolicy) => (
  policy.validateResultSemantics
    ? ClassifyResultSchema.parse(result)
    : ClassifyResultShapeSchema.parse(result)
);

/** What a user acts on. Two samples agree only when all of it matches. */
const decision = (result: ClassifyResult) =>
  `${result.status}/${result.channel ?? 'null'}/${result.next_action?.type ?? 'none'}/${result.item_kind ?? 'none'}`;

/**
 * Classify an item within its budget: text takes one sample, an image the majority
 * of independent samples.
 */
export async function classifyItem(
  request: ClassifyRequest,
  // Injectable so the retry policy can be tested without a live provider. This is
  // the code that only ever runs when something is already broken, so leaving it
  // unexercised repeats the mistake that let the old fallback rot unnoticed.
  provider: ClassifyProvider = new TokenHubProvider(),
  executionPolicy: ClassificationExecutionPolicy = DEFAULT_EXECUTION_POLICY,
): Promise<ClassifyResult> {
  const deadline = Date.now() + BUDGET_MS(request, executionPolicy);
  return request.image
    ? classifyImageByMajority(provider, request, executionPolicy, deadline)
    : drawSample(provider, request, executionPolicy, deadline);
}

/** Independent samples drawn for one photo; any two that agree decide it. */
const IMAGE_SAMPLES = 3;

/**
 * Classify an image by the majority of independent samples.
 *
 * The vendor fixes the vision model's temperature (1.0 for the K3 family), so one
 * photo can draw different answers from different calls. On 2026-11-01 the previous
 * model, kimi-k2.6, called the same tight crop of a canned coffee a "powder tin" for
 * blue_bin in one run and a "sachet" for general_waste in the next, each at
 * confidence 0.9 or more, and no prompt rule removes sampling noise.
 *
 * All three samples start together and the first two that agree are the answer, which
 * is the same answer as waiting for a majority of three. Drawing the tiebreak only
 * after a disagreement added 15–19s to 2 of the 9 photos the app sent on 2026-11-06,
 * and waiting for both of two samples meant the slower one set the pace. Without a
 * majority the answer is not_sure. One sample that cannot be drawn leaves the other
 * two to decide; with fewer than two samples there is no vote, so the classification
 * fails as a single call would.
 */
async function classifyImageByMajority(
  provider: ClassifyProvider,
  request: ClassifyRequest,
  executionPolicy: ClassificationExecutionPolicy,
  deadline: number,
): Promise<ClassifyResult> {
  const cancel = new AbortController();
  try {
    return await new Promise<ClassifyResult>((resolve, reject) => {
      const samples: ClassifyResult[] = [];
      let failed = 0;
      let lastError: Error | undefined;
      let decided = false;
      const settle = () => {
        if (decided) return;
        const agreed = samples.find((sample, index) => samples.some(
          (other, otherIndex) => otherIndex !== index && decision(other) === decision(sample)));
        if (agreed) {
          decided = true;
          if (samples.some((sample) => decision(sample) !== decision(agreed))) {
            console.warn(`[ai] Image samples disagree (${samples.map(decision).join(', ')}); answering the majority`);
          }
          resolve(agreed);
          return;
        }
        if (samples.length + failed < IMAGE_SAMPLES) return;
        decided = true;
        if (samples.length < 2) {
          reject(lastError ?? new Error('AI service temporarily unavailable. Please try again.'));
          return;
        }
        // A sample that already chose not_sure carries the application's own copy and,
        // when its evidence allows, the check action.
        console.warn(`[ai] Image samples have no majority (${samples.map(decision).join(', ')}); answering not_sure`);
        resolve(samples.find((sample) => sample.status === 'not_sure')
          ?? validate(toUnconfirmed(samples[0], request.locale ?? 'en'), executionPolicy));
      };
      for (let n = 0; n < IMAGE_SAMPLES; n += 1) {
        drawSample(provider, request, executionPolicy, deadline, cancel.signal).then(
          (sample) => {
            samples.push(sample);
            settle();
          },
          (err: Error) => {
            if (!decided) console.warn(`[ai] Image sample failed: ${err.message}`);
            failed += 1;
            lastError = err;
            settle();
          },
        );
      }
    });
  } finally {
    // Once two samples agree, the third is no longer needed; stop it rather than pay for it.
    cancel.abort();
  }
}

/**
 * Draw one classification, retrying transient failures until the deadline.
 *
 * The retry is not defensive padding — it covers a specific, reproduced behaviour:
 * a model that has been idle answers the first request with `504 504001` after
 * ~3.2s and serves the next one normally. With no second provider left to absorb
 * that, an un-retried cold start is a 500 for the first user after a quiet period,
 * and BinWhere's traffic is quiet enough for that to be the common case rather than
 * the rare one.
 */
async function drawSample(
  provider: ClassifyProvider,
  request: ClassifyRequest,
  executionPolicy: ClassificationExecutionPolicy,
  deadline: number,
  cancel?: AbortSignal,
): Promise<ClassifyResult> {
  let lastError: Error | undefined;

  for (let n = 1; n <= executionPolicy.maxAttempts; n += 1) {
    const remaining = deadline - Date.now();
    if (cancel?.aborted || (n > 1 && remaining < executionPolicy.minAttemptMs)) break;

    try {
      const result = await attempt(
        provider,
        request,
        Math.min(ATTEMPT_MS(request, executionPolicy), remaining),
        cancel,
      );
      if (n > 1) {
        // A retry that succeeds still means the first call failed. Say so, or the
        // provider degrades invisibly until it degrades past the budget too.
        console.warn(`[ai] Classify succeeded on attempt ${n} — previous attempt failed: ${lastError?.message}`);
      }
      return validate(result, executionPolicy);
    } catch (err) {
      lastError = err as Error;
      if (cancel?.aborted) break;
      if (!(err instanceof RetryableProviderError)) {
        // A bad key, an exhausted balance, a model the account cannot call: retrying
        // cannot change the answer, and pretending otherwise buries the real cause.
        console.error(`[ai] Classify failed permanently: ${lastError.message}`);
        break;
      }
      console.warn(`[ai] Classify attempt ${n} failed: ${lastError.message}`);

      if (n < executionPolicy.maxAttempts) {
        const delayMs = err.retryAfterMs ?? executionPolicy.retryBackoffMs * (2 ** (n - 1));
        const remainingAfterFailure = deadline - Date.now();
        if (delayMs + executionPolicy.minAttemptMs > remainingAfterFailure) {
          console.warn(
            `[ai] Retry skipped: ${remainingAfterFailure}ms remains, but the next attempt needs ` +
              `${delayMs}ms delay plus ${executionPolicy.minAttemptMs}ms to run`,
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
