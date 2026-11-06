import { NextRequest, NextResponse } from 'next/server';

import { getClientIp } from './http-utils';

// ═══════════════════════════════════════════════════════════
//  Configurable limits — adjust these values as needed
// ═══════════════════════════════════════════════════════════

const MINUTE = 60_000;
const DAY = 86_400_000;

export interface RateLimitRule {
  windowMs: number;
  max: number;
}

export interface RateLimitConfig {
  /** Per-IP rules (all must pass) */
  perIp: RateLimitRule[];
  /** Global rules across all IPs */
  global?: RateLimitRule[];
}

/** /api/v1/classify — strictest (external AI cost) */
export const CLASSIFY_LIMITS: RateLimitConfig = {
  perIp: [
    { windowMs: MINUTE, max: 10 },  // 10 req/min per IP
    { windowMs: DAY, max: 30 },     // 30 req/day per IP
  ],
  global: [
    { windowMs: DAY, max: 500 },    // 500 req/day total
  ],
};

/** /api/v1/nearby — basic protection */
export const DEFAULT_LIMITS: RateLimitConfig = {
  perIp: [
    { windowMs: MINUTE, max: 10 },  // 10 req/min per IP
  ],
};

// ═══════════════════════════════════════════════════════════
//  Origin allowlist
// ═══════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  'https://binwhere.sg',
  'https://www.binwhere.sg',
];

const isDev = process.env.NODE_ENV === 'development';

// ═══════════════════════════════════════════════════════════
//  Sliding window store
// ═══════════════════════════════════════════════════════════

class SlidingWindowStore {
  private buckets = new Map<string, number[]>();
  private lastCleanup = Date.now();
  private static CLEANUP_INTERVAL = 5 * MINUTE;
  private static MAX_KEYS = 10_000;

  check(key: string, windowMs: number, max: number): { ok: boolean; retryAfterS: number } {
    this.maybeCleanup();

    const now = Date.now();
    const cutoff = now - windowMs;
    const timestamps = this.buckets.get(key) ?? [];
    const valid = timestamps.filter((t) => t > cutoff);

    if (valid.length >= max) {
      const retryAfterMs = valid[0] - cutoff;
      this.buckets.set(key, valid);
      return { ok: false, retryAfterS: Math.ceil(retryAfterMs / 1000) };
    }

    valid.push(now);
    this.buckets.set(key, valid);
    return { ok: true, retryAfterS: 0 };
  }

  private maybeCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < SlidingWindowStore.CLEANUP_INTERVAL) return;
    this.lastCleanup = now;

    // Purge entries with no recent activity
    const keys = Array.from(this.buckets.keys());
    for (const key of keys) {
      const timestamps = this.buckets.get(key)!;
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] < now - DAY) {
        this.buckets.delete(key);
      }
    }

    // Emergency cap: if too many keys (distributed attack), drop oldest half
    if (this.buckets.size > SlidingWindowStore.MAX_KEYS) {
      const entries = Array.from(this.buckets.entries())
        .sort((a, b) => (a[1][a[1].length - 1] ?? 0) - (b[1][b[1].length - 1] ?? 0));
      const toDelete = Math.floor(entries.length / 2);
      for (let i = 0; i < toDelete; i++) {
        this.buckets.delete(entries[i][0]);
      }
    }
  }
}

// Module-level singletons (persist across requests in same process)
const ipStore = new SlidingWindowStore();
const globalStore = new SlidingWindowStore();

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Origin/Referer check.
 * - If Origin is present and not in allowlist → block (cross-origin abuse)
 * - If no Origin but Referer is present and wrong domain → block
 * - If neither present → allow (same-origin or direct call, still rate-limited)
 * - In dev mode → always allow
 */
function checkOrigin(request: NextRequest): boolean {
  if (isDev) return true;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (origin && !ALLOWED_ORIGINS.includes(origin)) return false;
  if (!origin && referer) {
    try {
      if (!ALLOWED_ORIGINS.includes(new URL(referer).origin)) return false;
    } catch {
      return false;
    }
  }

  return true;
}

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════

/**
 * Check origin + rate limits for an incoming request.
 * Returns null if allowed, or a 403/429 NextResponse if blocked.
 *
 * Usage:
 * ```ts
 * const blocked = checkRateLimit(request, CLASSIFY_LIMITS);
 * if (blocked) return blocked;
 * ```
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
): NextResponse | null {
  // 1. Origin check
  if (!checkOrigin(request)) {
    return NextResponse.json(
      { code: 'FORBIDDEN', error: 'Forbidden' },
      { status: 403 },
    );
  }

  const ip = getClientIp(request);
  const scope = request.nextUrl.pathname;

  // 2. Per-IP limits (each rule has its own bucket)
  for (const rule of config.perIp) {
    const result = ipStore.check(`${scope}:${ip}:${rule.windowMs}`, rule.windowMs, rule.max);
    if (!result.ok) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(result.retryAfterS) } },
      );
    }
  }

  // 3. Global limits
  if (config.global) {
    for (const rule of config.global) {
      const result = globalStore.check(`${scope}:__global__:${rule.windowMs}`, rule.windowMs, rule.max);
      if (!result.ok) {
        return NextResponse.json(
          { code: 'RATE_LIMITED', error: 'Service temporarily unavailable' },
          { status: 429, headers: { 'Retry-After': String(result.retryAfterS) } },
        );
      }
    }
  }

  return null;
}
