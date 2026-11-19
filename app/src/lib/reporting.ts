import {
  ServerRuntimeClient,
  createStackParser,
  createTransport,
  getClient,
  getCurrentScope,
  nodeStackLineParser,
  type ErrorEvent,
} from '@sentry/core';
import type { Instrumentation } from 'next';

import type { EventFields } from './telemetry';

const stackParser = createStackParser(nodeStackLineParser());

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.breadcrumbs;
  delete event.contexts?.trace;
  delete event.sdkProcessingMetadata;
  if (event.request) {
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.query_string;
    delete event.request.data;
    if (event.request.url) {
      event.request.url = new URL(event.request.url, 'http://localhost').pathname;
    }
  }
  return event;
}

export function initReporting(fetcher: typeof fetch = fetch): ServerRuntimeClient | undefined {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    getCurrentScope().setClient(undefined);
    console.log('[sentry] reporting off');
    return;
  }

  const client = new ServerRuntimeClient({
    dsn,
    environment: 'production',
    platform: 'node',
    integrations: [],
    stackParser,
    sendDefaultPii: false,
    sendClientReports: false,
    maxBreadcrumbs: 0,
    beforeSend: scrubEvent,
    transport: (options) => createTransport(options, async ({ body }) => {
      try {
        const response = await fetcher(options.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-sentry-envelope' },
          body: typeof body === 'string' ? body : new Uint8Array(body),
          signal: AbortSignal.timeout(2000),
        });
        await response.body?.cancel();
        if (!response.ok) console.error('[sentry] send failed');
        return {
          statusCode: response.status,
          headers: {
            'x-sentry-rate-limits': response.headers.get('x-sentry-rate-limits'),
            'retry-after': response.headers.get('retry-after'),
          },
        };
      } catch {
        console.error('[sentry] send failed');
        return {};
      }
    }),
  });
  getCurrentScope().setClient(client);
  client.init();
  console.log('[sentry] reporting on');
  return client;
}

export const reportRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const client = getClient();
  if (!client) return;
  client.captureEvent({
    level: 'error',
    exception: {
      values: [{
        type: error instanceof Error ? error.name : typeof error,
        stacktrace: {
          frames: error instanceof Error ? stackParser(error.stack ?? '', 1) : [],
        },
      }],
    },
    request: {
      method: request.method,
      url: new URL(request.path, 'http://localhost').pathname,
    },
    tags: { routeType: context.routeType, routePath: context.routePath },
  });
};

export function reportEvent(event: string, fields: EventFields): void {
  if (event === 'provider_contract' || (typeof fields.http === 'number' && fields.http >= 500)) {
    getClient()?.captureEvent({ level: 'error', message: event, extra: { ...fields } });
  }
}
