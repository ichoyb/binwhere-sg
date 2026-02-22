import { RATE_LIMITS, RATE_LIMITS_WITH_KEY, type EndpointType } from '../shared/constants';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

/**
 * Endpoint-aware sliding-window rate limiter.
 * Maintains independent buckets for datastore and download endpoints.
 */
export class RateLimiter {
  private buckets: Map<EndpointType, number[]> = new Map();
  private configs: Record<EndpointType, RateLimitConfig>;

  constructor(hasApiKey: boolean) {
    this.configs = hasApiKey ? { ...RATE_LIMITS_WITH_KEY } : { ...RATE_LIMITS };
    for (const key of Object.keys(this.configs) as EndpointType[]) {
      this.buckets.set(key, []);
    }
  }

  /** Determine endpoint type from URL */
  static resolveEndpointType(url: string): EndpointType {
    if (url.includes('poll-download') || url.includes('initiate-download')) return 'download';
    return 'datastore';
  }

  /**
   * Wait until a request slot is available, then record it.
   * Returns the wait time in ms (0 if no wait needed).
   */
  async acquire(endpoint: EndpointType): Promise<number> {
    const config = this.configs[endpoint];
    const timestamps = this.buckets.get(endpoint)!;
    const now = Date.now();

    // Purge expired timestamps
    const cutoff = now - config.windowMs;
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift();
    }

    if (timestamps.length < config.maxRequests) {
      timestamps.push(now);
      return 0;
    }

    // Need to wait until oldest timestamp expires
    const waitMs = timestamps[0] - cutoff + 1;
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    // Purge again after waiting
    const nowAfterWait = Date.now();
    const newCutoff = nowAfterWait - config.windowMs;
    while (timestamps.length > 0 && timestamps[0] <= newCutoff) {
      timestamps.shift();
    }

    timestamps.push(nowAfterWait);
    return waitMs;
  }
}
