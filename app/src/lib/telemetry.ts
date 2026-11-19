import { createHash, randomBytes } from 'node:crypto';

import { getClientIp } from './http-utils';
import { reportEvent } from './reporting';

/**
 * Structured application events — the business half of observability.
 *
 * Caddy's access log covers the HTTP boundary, but the signals that matter most
 * here are invisible at that layer: a nearby query that finds nothing still
 * returns 200, and so does a low-confidence classification. A rate-limited
 * request is worse — the user sees a broken channel and the server records
 * nothing at all. Those are the events recorded here.
 *
 * Output is one JSON object per line on stdout, which systemd already captures
 * into journald with its own rotation. That means no log files to own, no
 * permissions to get wrong, and `journalctl -u binwhere` as the query tool.
 *
 * Privacy: no raw client IP and no exact coordinates ever reach an event.
 * Analysis needs to tell clients and areas apart, not identify people.
 */

/** Prefix that makes events greppable and separable from free-form logs. */
const EVENT_PREFIX = '[evt]';

/**
 * Per-process salt for hashing client IPs.
 *
 * Deliberately random rather than a configured secret: the questions worth
 * asking ("was that one user retrying or three users?", "is one IP hammering
 * us?") only span minutes, so correlation is not needed across restarts.
 * Losing it on deploy is a privacy property, not a defect, and it keeps a new
 * required env var — and a new way for deploys to fail — out of the system.
 */
const SALT = randomBytes(16).toString('hex');

/** Short, non-reversible stand-in for a client IP. */
export function clientId(request: Request): string {
  const ip = getClientIp(request);
  return createHash('sha256').update(SALT).update(ip).digest('hex').slice(0, 12);
}

/**
 * Round a coordinate to a ~1 km grid cell.
 *
 * Coverage analysis ("which areas come back empty?") works at neighbourhood
 * resolution; a user's exact position is never needed and is not stored.
 */
export function gridCell(lat: number, lng: number): string {
  const round = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
  return `${round(lat)},${round(lng)}`;
}

export type EventFields = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Emit one structured event.
 *
 * `undefined` means "field does not apply here" and is dropped; `null` means
 * "applies, and is empty" — an AI result with no channel, for instance — and is
 * kept, because that is a finding rather than a gap.
 */
export function logEvent(event: string, fields: EventFields): void {
  const payload: Record<string, string | number | boolean | null> = {
    t: new Date().toISOString(),
    evt: event,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) payload[key] = value;
  }
  console.log(`${EVENT_PREFIX} ${JSON.stringify(payload)}`);
  reportEvent(event, fields);
}
