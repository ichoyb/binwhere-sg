import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { onRequestError } from '../instrumentation';
import { initReporting } from './reporting';
import { logEvent } from './telemetry';

async function runTest(name: string, fn: () => Promise<void>) {
  await fn();
  console.log(`PASS ${name}`);
}

async function main() {
  const originalDsn = process.env.SENTRY_DSN;
  const originalRuntime = process.env.NEXT_RUNTIME;
  const originalLog = console.log;
  const originalError = console.error;
  const envelopes: string[] = [];
  const lines: string[] = [];
  const failures: string[] = [];
  const transport: typeof fetch = async (_url, options) => {
    assert.equal(options?.method, 'POST');
    assert.equal(typeof options.body, 'string');
    envelopes.push(options.body as string);
    return new Response(null, { status: 200 });
  };
  const captureConsole = () => {
    lines.length = 0;
    failures.length = 0;
    console.log = (...args: unknown[]) => { lines.push(args.join(' ')); };
    console.error = (...args: unknown[]) => { failures.push(args.join(' ')); };
  };
  const restoreConsole = () => {
    console.log = originalLog;
    console.error = originalError;
  };
  const context = { routerKind: 'App Router', routeType: 'route', routePath: '/api/v1/nearby', revalidateReason: undefined } as const;
  const path = '/api/v1/nearby?lat=1.36912345&lng=103.84543210';
  const request = {
    method: 'GET', path,
    headers: { 'CF-Connecting-IP': '203.0.113.77', cookie: 'private-cookie' },
    body: 'private-request-body',
  };
  Object.assign(process.env, { NEXT_RUNTIME: 'nodejs', SENTRY_DSN: 'http://public@127.0.0.1:26013/1' });

  try {
    await runTest('request errors omit messages and all request secrets from the envelope', async () => {
      captureConsole();
      const reporting = initReporting(transport)!;
      const error = new TypeError('private-description 1.36912345 103.84543210 203.0.113.77 private-cookie private-request-body');
      error.stack = `${error.name}: ${error.message}\n    at nearby (/app/src/nearby.ts:12:4)`;
      await onRequestError(error, request, context);
      await reporting.flush(1000);
      restoreConsole();
      assert.deepEqual(lines, ['[sentry] reporting on']);
      assert.equal(envelopes.length, 1);
      const envelope = envelopes.pop()!;
      for (const secret of ['1.36912345', '103.84543210', '203.0.113.77', 'private-cookie', 'private-request-body', 'private-description', 'CF-Connecting-IP']) {
        assert.ok(!envelope.includes(secret), secret);
      }
      const event = JSON.parse(envelope.split('\n')[2]);
      assert.deepEqual(event.request, { method: 'GET', url: '/api/v1/nearby' });
      assert.equal(event.exception.values[0].type, 'TypeError');
      assert.equal(event.exception.values[0].value, undefined);
      assert.equal(event.message, undefined);
      assert.equal(event.exception.values[0].stacktrace.frames[0].filename, '/app/src/nearby.ts');
      assert.equal(event.exception.values[0].stacktrace.frames[0].lineno, 12);
      assert.deepEqual(event.tags, { routeType: 'route', routePath: '/api/v1/nearby' });
      assert.equal(event.environment, 'production');
      assert.equal(event.release, undefined);
      assert.equal(event.contexts?.trace, undefined);
      assert.equal(event.breadcrumbs, undefined);
    });

    await runTest('beforeSend removes request data, user and query strings before serialisation', async () => {
      captureConsole();
      const reporting = initReporting(transport)!;
      reporting.captureEvent({
        level: 'error',
        request: {
          method: 'GET', url: `https://example.invalid${path}`,
          headers: request.headers, cookies: { session: 'private-cookie' },
          query_string: 'lat=1.36912345&lng=103.84543210', data: request.body,
        },
        user: { ip_address: '203.0.113.77' },
        breadcrumbs: [{ message: 'private-description' }],
      });
      await reporting.flush(1000);
      restoreConsole();
      const envelope = envelopes.pop()!;
      for (const secret of ['1.36912345', '103.84543210', '203.0.113.77', 'private-cookie', 'private-request-body', 'private-description', 'example.invalid']) {
        assert.ok(!envelope.includes(secret), secret);
      }
      const event = JSON.parse(envelope.split('\n')[2]);
      assert.deepEqual(event.request, { method: 'GET', url: '/api/v1/nearby' });
      assert.equal(event.user, undefined);
    });

    await runTest('logEvent forwards only provider contracts and numeric server failures with original fields', async () => {
      captureConsole();
      const reporting = initReporting(transport)!;
      const fields = { http: 500, client: 'hashed-client', cell: '1.37,103.85', ok: false, ms: 0, channel: null };
      logEvent('nearby', fields);
      logEvent('provider_contract', { model: 'hy3', issue: 'reasoning_not_disabled', reasoning: 4 });
      for (const http of [200, 400, 429, 499, '500', undefined]) logEvent('nearby', { http });
      await reporting.flush(1000);
      restoreConsole();
      assert.equal(envelopes.length, 2);
      const events = envelopes.splice(0).map((envelope) => JSON.parse(envelope.split('\n')[2]));
      assert.deepEqual(events.map((event) => event.message), ['nearby', 'provider_contract']);
      assert.deepEqual(events[0].extra, fields);
      assert.deepEqual(events[1].extra, { model: 'hy3', issue: 'reasoning_not_disabled', reasoning: 4 });
      assert.equal(lines.filter((line) => line.startsWith('[evt] ')).length, 8);
      assert.ok(lines[1].startsWith('[evt] '));
    });

    await runTest('separately loaded server modules send through the initialised client', async () => {
      captureConsole();
      const reporting = initReporting(transport)!;
      const moduleRequire = createRequire(__filename);
      const modulePath = moduleRequire.resolve('./reporting');
      const cachedModule = moduleRequire.cache[modulePath];
      delete moduleRequire.cache[modulePath];
      const separateModule = moduleRequire(modulePath) as typeof import('./reporting');
      moduleRequire.cache[modulePath] = cachedModule;
      separateModule.reportEvent('nearby', { http: 503 });
      await reporting.flush(1000);
      restoreConsole();
      assert.equal(envelopes.length, 1);
      const event = JSON.parse(envelopes.pop()!.split('\n')[2]);
      assert.equal(event.message, 'nearby');
      assert.deepEqual(event.extra, { http: 503 });
    });

    await runTest('unset DSN sends nothing and leaves logEvent working', async () => {
      captureConsole();
      delete process.env.SENTRY_DSN;
      assert.equal(initReporting(transport), undefined);
      logEvent('nearby', { http: 503 });
      logEvent('provider_contract', { model: 'hy3' });
      await onRequestError(new Error('private-description'), request, context);
      restoreConsole();
      assert.equal(envelopes.length, 0);
      assert.equal(lines[0], '[sentry] reporting off');
      assert.equal(lines.filter((line) => line.startsWith('[evt] ')).length, 2);
      assert.deepEqual(failures, []);
    });

    for (const failure of ['throw', 'timeout', 'http'] as const) {
      await runTest(`transport ${failure} leaves logEvent non-blocking and logs one fixed failure line`, async () => {
        captureConsole();
        process.env.SENTRY_DSN = 'http://public@127.0.0.1:26013/1';
        let started = false;
        const reporting = initReporting((_url, options) => {
          started = true;
          if (failure === 'throw') throw new Error('private-transport-error');
          if (failure === 'http') return Promise.resolve(new Response(null, { status: 500 }));
          return new Promise((resolve, reject) => {
            const pendingResponse = setTimeout(() => resolve(new Response(null, { status: 200 })), 10000);
            options!.signal!.addEventListener('abort', () => {
              clearTimeout(pendingResponse);
              reject(options!.signal!.reason);
            }, { once: true });
          });
        })!;
        assert.doesNotThrow(() => logEvent('nearby', { http: 500 }));
        assert.ok(started);
        assert.equal(lines.length, 2);
        if (failure === 'timeout') assert.deepEqual(failures, []);
        assert.equal(await reporting.flush(3000), true);
        restoreConsole();
        assert.deepEqual(failures, ['[sentry] send failed']);
        assert.ok(lines[1].startsWith('[evt] '));
      });
    }
  } finally {
    restoreConsole();
    if (originalDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalDsn;
    if (originalRuntime === undefined) delete process.env.NEXT_RUNTIME;
    else Object.assign(process.env, { NEXT_RUNTIME: originalRuntime });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
