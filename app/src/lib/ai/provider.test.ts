import assert from 'node:assert/strict';

import { ApiError, isRetryable } from '../api-client';
import { ATTEMPT_MS, BUDGET_MS, classifyItem } from './provider';
import { getClassifySystemPrompt } from './prompts/classify-system';
import {
  RetryableProviderError,
  TOKENHUB_IMAGE_USER_INSTRUCTION,
  TokenHubProvider,
  type TokenHubProviderOptions,
} from './providers/tokenhub';
import type { ClassifyProvider, ClassifyRequest, ClassifyResult } from './types';
import { PRODUCTION_PROFILE } from '../../../scripts/phase0/baseline-profiles';

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

const TEST_JPEG_BASE64 = '/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpAB//Z';

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

function completionResponse(content: unknown, usage?: unknown): Response {
  return new Response(JSON.stringify({
    choices: [{ message: { content }, finish_reason: 'stop' }],
    ...(usage === undefined ? {} : { usage }),
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
  await runTest('BCRS prompt never turns an unknown mark into a blue-bin guess', async () => {
    const prompt = getClassifySystemPrompt('en');
    assert.match(prompt, /Distinguish unknown from absent/);
    assert.match(prompt, /one view in which the mark is not visible or readable is NOT proof/);
    assert.match(prompt, /return status "not_sure", channel null/);
    assert.match(prompt, /label at every orientation/);
    assert.match(prompt, /Product of Malaysia/);
    assert.match(prompt, /circular-arrow 10¢ shape alone is insufficient/);
    assert.match(prompt, /even when the image was taken beside a return machine/);
    assert.match(prompt, /Bottle, can and cup shapes are judged by the same material, volume and evidence rules/);
    assert.match(prompt, /square 2D traceability code[^\n]*cannot substitute/);
    assert.match(prompt, /separate linear EAN product barcode visibly present and unobscured/);
    assert.match(prompt, /Return Point performs the final scan/);
    assert.match(prompt, /A not_sure response must not mention or recommend blue_bin at all/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /plastic or metal beverage container, including a bottle, can or cup/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /sideways or upside down/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /linear EAN product barcode/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /square 2D traceability code[^\n]*cannot substitute/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /Small text counts as direct pixel evidence/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /if either SG or RETURN is blurred or only inferred, use not_sure/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /incidental out-of-focus background containers do not disqualify/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /Return Point performs the final scan/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /do not mention blue_bin/);
    assert.doesNotMatch(prompt, /Deposit Mark is unknown[^\n]*prefer blue_bin/);
  });

  await runTest('classification prompt preserves the reviewed Singapore routing rules', async () => {
    const prompt = getClassifySystemPrompt('en');
    assert.match(prompt, /aerosol can is blue_bin only when no product comes out/);
    assert.match(prompt, /including "leftover paint"[^\n]*hazardous \/ special_handling/);
    assert.match(prompt, /Clean, dry bubble wrap[^\n]*blue_bin/);
    assert.match(prompt, /Power banks are ICT equipment[^\n]*ewaste, not ewaste_battery/);
    assert.match(prompt, /loose lithium-ion battery removed from a laptop[^\n]*ewaste_battery/);
    assert.match(prompt, /laptop with its battery still installed remains ewaste/);
    assert.match(prompt, /lead-acid car battery is hazardous/);
    assert.match(prompt, /incandescent, CFL, fluorescent or LED[^\n]*lighting/);
    assert.match(prompt, /expired household medicine[^\n]*general_waste/);
    assert.match(prompt, /Textile routing is explicit/);
    assert.match(prompt, /jackets, shoes, handbags, backpacks, curtains and bedsheets/);
    assert.match(prompt, /Heavily stained, torn, wet or mouldy textiles[^\n]*general_waste/);
    assert.match(prompt, /coffee capsules \(including Nespresso\)[^\n]*general_waste/);
    assert.match(prompt, /Hazardous is a safety classification, not proof of a public drop-off network/);
    assert.match(prompt, /Never invent a collection point or event/);
    assert.doesNotMatch(prompt, /Batteries of all types/);
  });

  await runTest('TokenHub sends the text model, locale and caller signal', async () => {
    const controller = new AbortController();
    await withMockFetch(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        messages: Array<{ content: unknown }>;
        response_format: {
          type: string;
          json_schema: {
            strict: boolean;
            schema: {
              additionalProperties: boolean;
              required: string[];
              properties: { channel: { type: string[] } };
            };
          };
        };
      };
      assert.equal(body.model, 'hy3');
      assert.equal(typeof body.messages[1]?.content, 'string');
      assert.match(body.messages[1]?.content as string, /Chinese \(Simplified\)/);
      assert.equal(init?.signal, controller.signal);
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-key');
      assert.equal(body.response_format.type, 'json_schema');
      assert.equal(body.response_format.json_schema.strict, true);
      assert.equal(body.response_format.json_schema.schema.additionalProperties, false);
      assert.deepEqual(
        body.response_format.json_schema.schema.properties.channel.type,
        ['string', 'null'],
      );
      assert.deepEqual(body.response_format.json_schema.schema.required, [
        'item', 'status', 'confidence', 'channel', 'reason', 'preparation', 'tip',
      ]);
      return completionResponse(JSON.stringify(OK));
    }, async () => {
      const result = await new TokenHubProvider('test-key').classify(
        { text: 'can', locale: 'zh' },
        controller.signal,
      );
      assert.equal(result.channel, 'return_point');
      assert.match(result.tip ?? '', /S\$0\.10/);
      assert.match(result.tip ?? '', /每个容器/);
    });
  });

  await runTest('TokenHub sends images to the vision model', async () => {
    await withMockFetch(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        temperature: number;
        thinking: unknown;
        reasoning_effort?: string;
        messages: Array<{ content: Array<{ type: string }> }>;
      };
      assert.equal(body.model, 'kimi-k2.6');
      assert.equal(body.temperature, 0.6);
      assert.deepEqual(body.thinking, { type: 'disabled' });
      assert.equal(body.reasoning_effort, undefined);
      assert.ok(Array.isArray(body.messages[1]?.content));
      assert.equal(body.messages[1]?.content.filter((part) => part.type === 'image_url').length, 1);
      return completionResponse(JSON.stringify(OK));
    }, async () => {
      await new TokenHubProvider('test-key').classify({ image: TEST_JPEG_BASE64 });
    });
  });

  await runTest('TokenHub owns uncertain copy and never leaks a disposal channel into not_sure', async () => {
    const modelResult: ClassifyResult = {
      item: '塑料饮料瓶',
      status: 'not_sure',
      confidence: 0.9,
      channel: null,
      reason: '无法看到 Deposit Mark。',
      preparation: ['查看条码。'],
      tip: '可以放入蓝色回收箱。',
    };
    await withMockFetch(
      async () => completionResponse(JSON.stringify(modelResult)),
      async () => {
        const result = await new TokenHubProvider('test-key').classify({ text: '饮料瓶', locale: 'zh' });
        assert.equal(result.status, 'not_sure');
        assert.equal(result.channel, null);
        assert.equal(result.confidence, 0.49);
        assert.equal(result.reason, '现有信息不足，无法安全确定回收渠道。');
        assert.deepEqual(result.preparation, [
          '请提供更清晰的照片或描述，并完整展示物品及其标签或标识。饮料容器请拍清产品条码周围的标签。',
        ]);
        assert.equal(result.tip, undefined);
      },
    );
  });

  await runTest('production baseline profile reproduces the deployed request contract', async () => {
    await withMockFetch(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        temperature: number;
        response_format: { type: string };
        messages: Array<{ content: string | Array<{ type: string; text?: string }> }>;
      };
      assert.equal(body.model, 'hy-vision-2.0-instruct');
      assert.equal(body.temperature, 0.3);
      assert.equal(body.response_format.type, 'json_object');
      assert.match(body.messages[0]?.content as string, /prefer blue_bin/);
      const userContent = body.messages[1]?.content;
      assert.ok(Array.isArray(userContent));
      assert.equal(userContent.filter((part) => part.type === 'image_url').length, 1);
      const instruction = userContent.find((part) => part.type === 'text')?.text;
      assert.equal(
        instruction,
        'What is this item? Classify it for recycling in Singapore. Respond in English.',
      );
      return completionResponse(JSON.stringify(OK));
    }, async () => {
      const result = await new TokenHubProvider(
        'test-key',
        PRODUCTION_PROFILE.providerOptions,
      ).classify({ image: TEST_JPEG_BASE64 });
      assert.equal(result.tip, undefined, 'production did not append refund copy in code');
    });
  });

  await runTest('TokenHub disables thinking on text and the frozen production image profile', async () => {
    for (const [request, model, options] of [
      [{ text: 'can' }, 'hy3', undefined],
      [{ image: TEST_JPEG_BASE64 }, 'hy-vision-2.0-instruct', PRODUCTION_PROFILE.providerOptions],
    ] as Array<[ClassifyRequest, string, TokenHubProviderOptions | undefined]>) {
      await withMockFetch(async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as {
          model: string;
          thinking: unknown;
          reasoning_effort?: string;
        };
        assert.equal(body.model, model);
        // A chain-of-thought bills as output, consumes max_tokens, and is what
        // turned hy3 into a 500 on 2026-08-29 with no change on this side. The
        // vendor default is not a contract, so every path must carry this.
        assert.deepEqual(body.thinking, { type: 'disabled' });
        assert.equal(body.reasoning_effort, undefined);
        return completionResponse(JSON.stringify(OK));
      }, async () => {
        await new TokenHubProvider('test-key', options).classify(request);
      });
    }
  });

  await runTest('A provider that thinks anyway is reported, not just warned about', async () => {
    // The console.warn below already existed on 2026-08-29 and recorded the
    // regression correctly. Nobody read it. An alarm nothing reads is the same
    // failure as the fallback that rotted unnoticed, so what is asserted here is
    // that the finding reaches the event stream — not merely that it is noticed.
    const lines: string[] = [];
    const original = { log: console.log, warn: console.warn, info: console.info };
    console.log = (...args: unknown[]) => { lines.push(args.join(' ')); };
    console.warn = () => {};
    console.info = () => {};
    try {
      await withMockFetch(
        async () => completionResponse(JSON.stringify(OK), {
          prompt_tokens: 1109,
          completion_tokens: 536,
          completion_tokens_details: { reasoning_tokens: 445 },
        }),
        async () => { await new TokenHubProvider('test-key').classify({ text: 'can' }); },
      );
    } finally {
      Object.assign(console, original);
    }
    const event = lines.find((line) => line.includes('"evt":"provider_contract"'));
    assert.ok(event, 'a nonzero reasoning count must reach the event stream');
    assert.match(event, /"issue":"reasoning_not_disabled"/);
    assert.match(event, /"reasoning":445/);
    assert.match(event, /"model":"hy3"/);
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

  await runTest('TokenHub rejects an inconsistent status and channel as retryable', async () => {
    const inconsistent = {
      ...OK,
      status: 'special_handling',
      channel: 'return_point',
    };
    await withMockFetch(
      async () => completionResponse(JSON.stringify(inconsistent)),
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

  await runTest('rejects a null channel unless the result is not_sure', async () => {
    const bad = { ...OK, status: 'not_recyclable', channel: null } as ClassifyResult;
    const provider: ClassifyProvider = { name: 'bad', async classify() { return bad; } };
    await assert.rejects(classifyItem({ text: 'medicine' }, provider));
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
