import assert from 'node:assert/strict';

import { ApiError, isRetryable } from '../api-client';
import { ATTEMPT_MS, BUDGET_MS, classifyItem } from './provider';
import { RetryableProviderError, TokenHubProvider } from './providers/tokenhub';
import type { ClassifyProvider, ClassifyRequest, ClassifyResult } from './types';

/**
 * Tests for the TokenHub request boundary and the retry policy that replaced the
 * fallback chain.
 *
 * With one provider left, this loop is the entire availability story, and it only
 * runs when something is already failing — the condition under which the previous
 * fallback quietly rotted for eleven days. So it is exercised here against a stub
 * rather than trusted to be obviously correct.
 */

const OK: ClassifyResult = {
  item: 'aluminium can',
  status: 'recyclable',
  confidence: 0.95,
  channel: 'return_point',
  reason: 'Has a Deposit Mark.',
};

/** Provider stub that plays back a scripted sequence of outcomes. */
function stub(script: Array<'ok' | Error | number>): ClassifyProvider & { calls: number } {
  return {
    name: 'stub',
    calls: 0,
    async classify(_request: ClassifyRequest, signal?: AbortSignal): Promise<ClassifyResult> {
      const step = script[this.calls] ?? 'ok';
      this.calls += 1;
      if (step === 'ok') return OK;
      if (step instanceof Error) throw step;
      // A number means "hang this many ms", to exercise the abort path.
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(OK), step);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('aborted'));
        });
      });
    },
  };
}

async function runTest(name: string, fn: () => Promise<void>) {
  await fn();
  console.log(`PASS ${name}`);
}

function completionResponse(content: unknown): Response {
  return new Response(JSON.stringify({
    choices: [{ message: { content }, finish_reason: 'stop' }],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function withMockFetch(mock: typeof fetch, fn: () => Promise<void>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function main() {
  await runTest('TokenHub sends the text model, locale and caller signal', async () => {
    const controller = new AbortController();
    await withMockFetch(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        messages: Array<{ content: unknown }>;
      };
      assert.equal(body.model, 'hy3');
      assert.equal(typeof body.messages[1]?.content, 'string');
      assert.match(body.messages[1]?.content as string, /Chinese \(Simplified\)/);
      assert.equal(init?.signal, controller.signal);
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-key');
      return completionResponse(JSON.stringify(OK));
    }, async () => {
      const result = await new TokenHubProvider('test-key').classify(
        { text: 'can', locale: 'zh' },
        controller.signal,
      );
      assert.equal(result.channel, 'return_point');
    });
  });

  await runTest('TokenHub sends images to the vision model', async () => {
    await withMockFetch(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        messages: Array<{ content: unknown }>;
      };
      assert.equal(body.model, 'hy-vision-2.0-instruct');
      assert.ok(Array.isArray(body.messages[1]?.content));
      return completionResponse(JSON.stringify(OK));
    }, async () => {
      await new TokenHubProvider('test-key').classify({ image: 'base64-image' });
    });
  });

  await runTest('TokenHub preserves Retry-After and request_id on 429', async () => {
    await withMockFetch(async () => new Response(JSON.stringify({
      error: {
        code: 429001,
        message: 'rate limited '.repeat(30),
        request_id: 'req-tokenhub-123',
      },
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '2' },
    }), async () => {
      await assert.rejects(
        new TokenHubProvider('test-key').classify({ text: 'can' }),
        (err: unknown) => {
          assert.ok(err instanceof RetryableProviderError);
          assert.equal(err.retryAfterMs, 2_000);
          assert.match(err.message, /code=429001/);
          assert.match(err.message, /request_id=req-tokenhub-123/);
          return true;
        },
      );
    });
  });

  await runTest('TokenHub keeps authentication failures permanent', async () => {
    await withMockFetch(async () => new Response(JSON.stringify({
      error: {
        code: '401002',
        message: 'invalid API key',
        request_id: 'req-auth-123',
      },
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }), async () => {
      await assert.rejects(
        new TokenHubProvider('test-key').classify({ text: 'can' }),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          assert.ok(!(err instanceof RetryableProviderError));
          assert.match(err.message, /request_id=req-auth-123/);
          return true;
        },
      );
    });
  });

  await runTest('TokenHub treats invalid model output as retryable', async () => {
    await withMockFetch(
      async () => completionResponse(JSON.stringify({ item: 'can' })),
      async () => {
        await assert.rejects(
          new TokenHubProvider('test-key').classify({ text: 'can' }),
          (err: unknown) => err instanceof RetryableProviderError,
        );
      },
    );
  });

  await runTest('succeeds on the first attempt without retrying', async () => {
    const provider = stub(['ok']);
    const result = await classifyItem({ text: 'can' }, provider);
    assert.equal(result.channel, 'return_point');
    assert.equal(provider.calls, 1);
  });

  await runTest('retries a transient failure — the cold-start 504 case', async () => {
    const provider = stub([new RetryableProviderError('TokenHub API error: 504 504001', 0), 'ok']);
    const result = await classifyItem({ text: 'can' }, provider);
    assert.equal(result.channel, 'return_point');
    assert.equal(provider.calls, 2);
  });

  await runTest('honours a provider retry delay', async () => {
    const provider = stub([new RetryableProviderError('TokenHub API error: 429', 30), 'ok']);
    const started = Date.now();
    await classifyItem({ text: 'can' }, provider);
    assert.ok(Date.now() - started >= 25);
    assert.equal(provider.calls, 2);
  });

  await runTest('does NOT retry a permanent failure', async () => {
    // A bad key or an exhausted balance answers identically every time; retrying
    // only delays the diagnosis behind a second round-trip.
    const provider = stub([new Error('TokenHub API error: 401 key does not exist')]);
    await assert.rejects(
      classifyItem({ text: 'can' }, provider),
      /AI service temporarily unavailable/,
    );
    assert.equal(provider.calls, 1);
  });

  await runTest('gives up after exhausting its attempts', async () => {
    const fail = () => new RetryableProviderError('TokenHub API error: 503', 0);
    const provider = stub([fail(), fail(), fail(), fail()]);
    await assert.rejects(classifyItem({ text: 'can' }, provider));
    assert.equal(provider.calls, 3);
  });

  await runTest('aborts a hung attempt and retries it', async () => {
    // The first call never answers. It must be abandoned rather than waited on, or
    // one stuck upstream request holds a user for the whole budget.
    const provider = stub([60_000, 'ok']);
    const started = Date.now();
    const result = await classifyItem({ text: 'can' }, provider);
    const elapsed = Date.now() - started;
    assert.equal(result.channel, 'return_point');
    assert.equal(provider.calls, 2);
    assert.ok(
      elapsed < BUDGET_MS({ text: 'can' }),
      `retry must fit inside the budget, took ${elapsed}ms`,
    );
  });

  await runTest('never exceeds the total budget', async () => {
    // Every attempt hangs, so the loop can only stop because the deadline stopped
    // it. Nothing on the client side sets a timeout, so this bound is the only
    // thing standing between a stuck provider and an indefinitely hanging user.
    const request: ClassifyRequest = { text: 'can' };
    const provider = stub([60_000, 60_000, 60_000, 60_000]);
    const started = Date.now();
    await assert.rejects(classifyItem(request, provider));
    const elapsed = Date.now() - started;
    assert.ok(
      elapsed <= BUDGET_MS(request) + 1_000,
      `expected <= ${BUDGET_MS(request)}ms, took ${elapsed}ms`,
    );
  });

  await runTest('an image gets a longer attempt and budget than text', async () => {
    // Images carry an upload and run a heavier model; text must not inherit that
    // latitude, since a text classify that slow is broken rather than busy.
    assert.ok(ATTEMPT_MS({ image: 'x' }) > ATTEMPT_MS({ text: 'can' }));
    assert.ok(BUDGET_MS({ image: 'x' }) > BUDGET_MS({ text: 'can' }));
    assert.ok(BUDGET_MS({ text: 'can' }) > ATTEMPT_MS({ text: 'can' }), 'budget must allow a retry');
  });

  await runTest('validates the provider result against the schema', async () => {
    // The provider already parses, but classifyItem is the boundary the route
    // trusts; a provider swapped in later must not be able to bypass the schema.
    const bad = { ...OK, channel: 'not_a_channel' } as unknown as ClassifyResult;
    const provider: ClassifyProvider = { name: 'bad', async classify() { return bad; } };
    await assert.rejects(classifyItem({ text: 'can' }, provider));
  });

  await runTest('does not repeat a classification after server retries are exhausted', async () => {
    assert.equal(
      isRetryable(new ApiError(500, 'CLASSIFICATION_FAILED', 'Classification failed')),
      false,
    );
    assert.equal(isRetryable(new ApiError(503, 'SERVER_BUSY', 'Server busy')), true);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
