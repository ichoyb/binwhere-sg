import { HTTP, API_KEY_ENV } from '../shared/constants';
import { HttpError } from '../shared/errors';
import { RateLimiter } from './rate-limiter';

export interface HttpClientOptions {
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * Base HTTP client with retry, endpoint-aware rate limiting, and error handling.
 */
export class HttpClient {
  readonly rateLimiter: RateLimiter;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options: HttpClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env[API_KEY_ENV];
    this.timeoutMs = options.timeoutMs ?? HTTP.TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? HTTP.MAX_RETRIES;
    this.rateLimiter = new RateLimiter(!!this.apiKey);
  }

  /** Make an HTTP GET request with rate limiting and retries */
  async get<T>(url: string): Promise<T> {
    const endpoint = RateLimiter.resolveEndpointType(url);
    await this.rateLimiter.acquire(endpoint);
    return this.requestWithRetry<T>(url, 'GET');
  }

  /** Make an HTTP POST request with rate limiting and retries */
  async post<T>(url: string, body: unknown): Promise<T> {
    const endpoint = RateLimiter.resolveEndpointType(url);
    await this.rateLimiter.acquire(endpoint);
    return this.requestWithRetry<T>(url, 'POST', body);
  }

  /** Download raw content (for S3 pre-signed URLs, no rate limit needed) */
  async downloadRaw(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs * 2);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new HttpError(response.status, response.statusText, url);
      }
      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestWithRetry<T>(url: string, method: string, body?: unknown): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.doRequest<T>(url, method, body);
      } catch (error) {
        lastError = error as Error;

        if (error instanceof HttpError) {
          // Don't retry on client errors (except 429)
          if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
            throw error;
          }
          // Rate limited — wait and retry
          if (error.statusCode === 429) {
            const waitMs = HTTP.RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue;
          }
        }

        // Exponential backoff for server errors
        if (attempt < this.maxRetries) {
          const waitMs = HTTP.RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }

  private async doRequest<T>(url: string, method: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new HttpError(response.status, text || response.statusText, url);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if ((error as Error).name === 'AbortError') {
        throw new HttpError(408, 'Request timeout', url);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
