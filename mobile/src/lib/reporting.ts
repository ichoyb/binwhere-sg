import * as Sentry from '@sentry/react-native';
import { setContractViolationReporter, type ContractViolation } from '../api/client';
import { scrubBreadcrumb, scrubEvent } from './scrub';

/**
 * Crash and contract-violation reporting.
 *
 * With almost no users nobody will tell us the app broke, so it has to tell
 * us itself. Sentry captures native crashes, unhandled JS errors and promise
 * rejections on its own; the two report functions add what it cannot see:
 * render errors caught by the ErrorBoundary, and a server response that no
 * longer matches the versioned contract this installed version was built against.
 *
 * Privacy: no PII, no performance tracing, no screenshots, and URLs are
 * scrubbed of coordinates before leaving the device (see scrub.ts).
 *
 * Configuration comes from two EXPO_PUBLIC_ variables, referenced literally
 * because Expo inlines them at bundle time and cannot resolve dynamic access.
 * A missing DSN switches reporting off loudly, so a build that forgot it
 * cannot be mistaken for one that never crashes; app.config.ts refuses to
 * build production without it at all.
 */

export type AppEnvironment = 'development' | 'preview' | 'production';

const APP_ENVIRONMENTS: readonly AppEnvironment[] = ['development', 'preview', 'production'];

/** Parse EXPO_PUBLIC_APP_ENV; unset means development, a typo is an error. */
export function resolveEnvironment(raw: string | undefined): AppEnvironment {
  if (raw === undefined || raw === '') return 'development';
  if ((APP_ENVIRONMENTS as readonly string[]).includes(raw)) return raw as AppEnvironment;
  throw new Error(`EXPO_PUBLIC_APP_ENV must be one of ${APP_ENVIRONMENTS.join(', ')}, got "${raw}"`);
}

let enabled = false;

export function isReportingEnabled(): boolean {
  return enabled;
}

export function initReporting(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const environment = resolveEnvironment(process.env.EXPO_PUBLIC_APP_ENV);

  if (!dsn) {
    if (environment === 'production') {
      throw new Error('EXPO_PUBLIC_SENTRY_DSN is required for a production build');
    }
    console.warn(`[reporting] EXPO_PUBLIC_SENTRY_DSN is not set — crash reporting is OFF (${environment})`);
    return;
  }

  Sentry.init({
    dsn,
    environment,
    debug: false,
    sendDefaultPii: false,
    // Release health ("did the new build start crashing on launch?") needs
    // sessions; it does not need tracing, screenshots or view hierarchies.
    enableAutoSessionTracking: true,
    enableAutoPerformanceTracing: false,
    enableAppStartTracking: false,
    enableNativeFramesTracking: false,
    enableStallTracking: false,
    enableUserInteractionTracing: false,
    enableCaptureFailedRequests: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    // The native iOS SDK records its own breadcrumb for every request, with
    // the query string (the user's lat/lng) in `http.query`. Native crash
    // reports never pass through beforeSend, and the SDK's dedupe keeps that
    // breadcrumb in JS events too, because its query-less url never matches
    // ours. So stop it at the source. JS fetch/XHR breadcrumbs, which
    // beforeBreadcrumb scrubs, already cover the same requests. Any other
    // native HTTP instrumentation (e.g. the Sentry Android Gradle Plugin's
    // OkHttp support) has to be turned off the same way.
    enableNetworkBreadcrumbs: false,
    maxBreadcrumbs: 30,
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
    beforeSend: (event) => scrubEvent(event),
  });
  enabled = true;

  setContractViolationReporter(reportContractViolation);
}

/** Report an error the app caught itself (render errors via the boundary). */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) {
    console.error('[reporting] (disabled)', error, context ?? '');
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Report a versioned contract violation: the server answered, the client could not
 * parse it. Grouped per endpoint so one bad deploy shows as one issue.
 */
export function reportContractViolation(violation: ContractViolation): void {
  const version = violation.endpoint === 'points' || violation.endpoint === 'route' ? 'v2' : 'v1';
  if (!enabled) {
    console.error(`[reporting] (disabled) ${version} contract violation`, violation);
    return;
  }
  Sentry.captureMessage(`${version} contract violation: ${violation.endpoint}`, {
    level: 'error',
    tags: { endpoint: violation.endpoint, http_status: String(violation.status) },
    extra: { issues: violation.issues },
  });
}
