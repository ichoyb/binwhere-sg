/**
 * Privacy scrubbing for crash reports.
 *
 * The only personal data the app ever puts in a URL is the user's position
 * (`lat` / `lng` on /api/v1/nearby). Crash reports carry recent network
 * breadcrumbs and the failing request's URL, so those values are blanked
 * before anything leaves the device. Pure string handling, no SDK import and
 * no `URL` (Hermes' implementation is incomplete), so it is unit-tested in Node.
 */

const SENSITIVE_QUERY_KEYS: readonly string[] = ['lat', 'lng'];
const REDACTED = '[redacted]';

/** Replace the values of location query parameters, keep everything else. */
export function scrubUrl(url: string): string {
  const q = url.indexOf('?');
  if (q === -1) return url;

  const base = url.slice(0, q);
  const rest = url.slice(q + 1);
  const hashIndex = rest.indexOf('#');
  const query = hashIndex === -1 ? rest : rest.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : rest.slice(hashIndex);

  const scrubbed = query
    .split('&')
    .map((pair) => {
      const eq = pair.indexOf('=');
      const key = eq === -1 ? pair : pair.slice(0, eq);
      return SENSITIVE_QUERY_KEYS.includes(key.toLowerCase())
        ? `${key}=${REDACTED}`
        : pair;
    })
    .join('&');

  return `${base}?${scrubbed}${hash}`;
}

/** Structural subset of a Sentry breadcrumb — keeps this module SDK-free. */
export interface ScrubbableBreadcrumb {
  data?: Record<string, unknown>;
}

/** Structural subset of a Sentry event. */
export interface ScrubbableEvent {
  request?: { url?: string };
  breadcrumbs?: ScrubbableBreadcrumb[];
}

export function scrubBreadcrumb<T extends ScrubbableBreadcrumb>(crumb: T): T {
  const url = crumb.data?.url;
  if (typeof url !== 'string') return crumb;
  return { ...crumb, data: { ...crumb.data, url: scrubUrl(url) } };
}

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const next: T = { ...event };
  if (typeof next.request?.url === 'string') {
    next.request = { ...next.request, url: scrubUrl(next.request.url) };
  }
  if (next.breadcrumbs) {
    next.breadcrumbs = next.breadcrumbs.map(scrubBreadcrumb);
  }
  return next;
}
