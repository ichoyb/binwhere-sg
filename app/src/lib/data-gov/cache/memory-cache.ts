interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleAt: number;
}

export interface MemoryCacheOptions {
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Stale-while-revalidate window in ms (defaults to ttlMs * 0.1) */
  staleWhileRevalidateMs?: number;
}

/**
 * Generic TTL memory cache with stale-while-revalidate support.
 * On Vercel serverless, this caches within a warm instance's lifetime.
 */
export class MemoryCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly swrMs: number;

  constructor(options: MemoryCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.swrMs = options.staleWhileRevalidateMs ?? options.ttlMs * 0.1;
  }

  /** Get a value from cache. Returns undefined if not found or fully expired. */
  get(key: string): { value: T; stale: boolean } | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    const now = Date.now();

    if (now > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    if (now > entry.staleAt) {
      return { value: entry.value, stale: true };
    }

    return { value: entry.value, stale: false };
  }

  /** Set a value in cache */
  set(key: string, value: T): void {
    const now = Date.now();
    this.store.set(key, {
      value,
      staleAt: now + this.ttlMs,
      expiresAt: now + this.ttlMs + this.swrMs,
    });
  }

  /** Clear all entries */
  clear(): void {
    this.store.clear();
  }

  /** Get current cache size */
  get size(): number {
    return this.store.size;
  }
}
