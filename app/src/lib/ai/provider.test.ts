import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BCRS_TEXT_CASES } from '../../../scripts/classify-eval/bcrs-test-cases';
import { TEST_ITEMS } from '../../../scripts/classify-eval/test-items';

import { ApiError, isRetryable } from '../api-client';
import { t } from '../i18n';
import { ATTEMPT_MS, BUDGET_MS, DEFAULT_EXECUTION_POLICY, classifyItem } from './provider';
import { getClassifySystemPrompt } from './prompts/classify-system';
import {
  RetryableProviderError,
  TOKENHUB_IMAGE_USER_INSTRUCTION,
  TOKENHUB_TEXT_REQUEST,
  TOKENHUB_VISION_REQUEST,
  TokenHubProvider,
} from './providers/tokenhub';
import type { ClassifyProvider, ClassifyRequest, ClassifyResult } from './types';
import { CANDIDATE_PROFILE, PRODUCTION_PROFILE, profileDigest, selectProfile } from '../../../scripts/classify-eval/baseline-profiles';

/**
 * Tests for the TokenHub request boundary and the retry policy that replaced the
 * fallback chain.
 *
 * With one provider left, this loop is the entire availability story, and it only
 * runs when something is already failing — the condition under which the previous
 * fallback quietly rotted for eleven days. So it is exercised here against a stub
 * rather than trusted to be obviously correct.
 */

const EVIDENCE = {
  beverage_product: 'prepackaged_beverage',
  visible_container_count: 'one',
  subject: 'single_prepackaged_beverage_container',
  form: 'can',
  material: 'metal',
  volume_range: '150ml_to_3l',
  singapore_mark: 'unknown',
  explicitly_no_singapore_mark: false,
  purchased_outside_singapore: false,
  damaged: false,
  contaminated: false,
} as const;

/** A model answer: everything but the status, which follows from the channel. */
const MODEL_OK = {
  beverage_evidence: EVIDENCE,
  item: 'aluminium can',
  confidence: 0.95,
  channel: 'return_point',
  reason: 'Has a Deposit Mark.',
} satisfies Omit<ClassifyResult, 'status'> & { beverage_evidence: typeof EVIDENCE };

const OK = { ...MODEL_OK, status: 'recyclable' } satisfies ClassifyResult & { beverage_evidence: typeof EVIDENCE };

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

/** Provider stub that returns a scripted sequence of classifications. */
function answers(script: ClassifyResult[]): ClassifyProvider & { calls: number } {
  return {
    name: 'answers',
    calls: 0,
    async classify(): Promise<ClassifyResult> {
      const result = script[this.calls];
      this.calls += 1;
      return result;
    },
  };
}

async function runTest(name: string, fn: () => Promise<void>) {
  await fn();
  console.log(`PASS ${name}`);
}

function completionResponse(content: unknown, usage?: unknown, finish = 'stop'): Response {
  return new Response(JSON.stringify({
    choices: [{ message: { content }, finish_reason: finish }],
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
  await runTest('BCRS prompts route by category without a mark or barcode prerequisite', async () => {
    for (const mode of ['text', 'image'] as const) {
      const prompt = getClassifySystemPrompt('en', mode);
      assert.match(prompt, /visible Deposit Mark or product barcode is not required/);
      assert.match(prompt, /observed contamination → general_waste/);
      assert.match(prompt, /capacity below 150ml or above 3L/);
      assert.match(prompt, /purchase outside Singapore → blue_bin/);
      assert.match(prompt, /Its capacity need not be known/);
      assert.match(prompt, /otherwise unknown, which never excludes the container/);
      assert.match(prompt, /if shape or material is unknown, a readable 10¢ SG RETURN Deposit Mark printed on that drink container can fill only those unknown facts/);
      assert.match(prompt, /cannot override known glass, carton, pouch/);
      assert.match(prompt, /A not_sure response must not mention or recommend blue_bin/);
      assert.doesNotMatch(prompt, /deposit_mark_text|deposit_mark_region|linear_barcode_on_subject|volume_ml|whole_container_visible/);
      assert.doesNotMatch(prompt, /Mandatory BCRS Decision|Distinguish unknown from absent|foreign only when/);
    }
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /readable capacity or visibly evident size; otherwise leave capacity unknown/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /can fill an unknown shape or material/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /Do not read or classify foreign deposit marks/);
    assert.match(TOKENHUB_IMAGE_USER_INSTRUCTION, /never from the brand alone/);
    assert.doesNotMatch(TOKENHUB_IMAGE_USER_INSTRUCTION, /Use return_point only when|linear EAN|deposit_mark_region/);
  });

  await runTest('BCRS instructions contain no benchmark inputs or product-capacity examples', async () => {
    for (const mode of ['text', 'image'] as const) {
      const prompt = getClassifySystemPrompt('en', mode);
      const scoped = prompt.slice(prompt.indexOf('15. **BCRS')) + TOKENHUB_IMAGE_USER_INSTRUCTION;
      for (const { text } of [...BCRS_TEXT_CASES, ...TEST_ITEMS]) {
        assert.ok(!scoped.toLowerCase().includes(text.toLowerCase()), `Benchmark input leaked: ${text}`);
      }
      const capacities = scoped.match(/\b\d+(?:\.\d+)?\s*(?:ml|cl|l)\b/ig) ?? [];
      assert.ok(capacities.every((capacity) => capacity === '150ml' || capacity === '3L'),
        'BCRS instructions may name category bounds, never product-size examples');
      assert.doesNotMatch(scoped, /ordinary can of soda|cultured milk/i);
      const rules = prompt.slice(prompt.indexOf('1. **Blue'), prompt.indexOf('15. **BCRS'));
      assert.equal(createHash('sha256').update(rules).digest('hex'),
        '666665a5fc08dd5e2fdfddafffd9fefa1d6791898244a82adf47b921c576ec77');
      const numbers = [...prompt.matchAll(/^(\d+)\. /gm)].map((match) => Number(match[1]));
      assert.deepEqual(numbers, Array.from({ length: 20 }, (_, index) => index + 1));
    }
  });

  await runTest('classification prompt preserves the reviewed Singapore routing rules', async () => {
    const prompt = getClassifySystemPrompt('en');
    assert.match(prompt, /aerosol can is blue_bin only when no product comes out/);
    assert.match(prompt, /including "leftover paint"[^\n]*hazardous \/ special_handling/);
    assert.match(prompt, /Clean, dry bubble wrap[^\n]*blue_bin/);
    assert.match(prompt, /Shampoo, soap and detergent bottles[^\n]*blue_bin[^\n]*pump or trigger head/);
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
        'item', 'confidence', 'channel', 'reason', 'preparation', 'tip', 'beverage_evidence',
      ]);
      const beverageEvidence = body.response_format.json_schema.schema.properties as unknown as {
        beverage_evidence: { required: string[] };
      };
      assert.ok(beverageEvidence.beverage_evidence.required.includes('beverage_product'));
      assert.ok(beverageEvidence.beverage_evidence.required.includes('visible_container_count'));
      return completionResponse(JSON.stringify(MODEL_OK));
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

  await runTest('TokenHub sends images to the vision model at low reasoning effort', async () => {
    await withMockFetch(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        temperature?: number;
        thinking?: unknown;
        reasoning_effort?: string;
        max_tokens?: number;
        max_completion_tokens?: number;
        messages: Array<{ content: Array<{ type: string }> }>;
      };
      assert.equal(body.model, 'kimi-k3.1-pro-highspeed');
      // The K3 family always reasons: `thinking: disabled` is accepted and then
      // leaks the reasoning into content, and the vendor fixes the temperature.
      assert.equal(body.reasoning_effort, 'low');
      assert.equal(body.max_completion_tokens, 8192);
      assert.equal(body.thinking, undefined);
      assert.equal(body.temperature, undefined);
      assert.equal(body.max_tokens, undefined);
      assert.ok(Array.isArray(body.messages[1]?.content));
      assert.equal(body.messages[1]?.content.filter((part) => part.type === 'image_url').length, 1);
      return completionResponse(JSON.stringify(MODEL_OK));
    }, async () => {
      await new TokenHubProvider('test-key')
        .classify({ image: TEST_JPEG_BASE64 });
    });
  });

  await runTest('images make exactly one model call for both known and mark-inferred categories', async () => {
    for (const patch of [{}, { form: 'unknown', material: 'unknown', volume_range: 'unknown', singapore_mark: 'readable' }]) {
      let calls = 0;
      await withMockFetch(async () => {
        calls += 1;
        assert.equal(calls, 1, 'a verifier call must not follow classification');
        return completionResponse(JSON.stringify({ ...MODEL_OK, beverage_evidence: { ...EVIDENCE, ...patch } }));
      }, async () => {
        const result = await new TokenHubProvider('test-key').classify({ image: TEST_JPEG_BASE64 });
        assert.equal(result.channel, 'return_point');
        assert.equal(result.next_action?.type, 'return_container');
        assert.equal(calls, 1);
      });
    }
  });

  await runTest('policy promotes an ordinary drink category and replaces contradictory model prose', async () => {
    for (const request of [{ text: 'water bottle' }, { image: TEST_JPEG_BASE64 }]) {
      await withMockFetch(async () => completionResponse(JSON.stringify({
        ...MODEL_OK, channel: 'blue_bin', reason: 'FOREIGN SCHEME GUESS', preparation: ['CRUSH IT'], tip: 'MODEL TIP',
      })), async () => {
        const result = await new TokenHubProvider('test-key').classify(request);
        assert.equal(result.channel, 'return_point');
        assert.equal(result.reason, t('en', 'bcrs.classifyReason'));
        assert.deepEqual(result.preparation, [1, 2, 3, 4].map((n) => t('en', `bcrs.step${n}` as Parameters<typeof t>[1])));
        assert.equal(result.tip, t('en', 'bcrs.refundAmount'));
        assert.doesNotMatch(JSON.stringify(result), /FOREIGN SCHEME GUESS|CRUSH IT|MODEL TIP/);
      });
    }
  });

  await runTest('unknown category facts keep all uncertain copy free of a disposal channel', async () => {
    await withMockFetch(async () => completionResponse(JSON.stringify({
      ...MODEL_OK, confidence: 0.9, channel: null,
      reason: 'Use blue recycling bin', preparation: ['Blue bin'], tip: '蓝色回收箱',
      beverage_evidence: { ...EVIDENCE, form: 'unknown' },
    })), async () => {
      const result = await new TokenHubProvider('test-key').classify({ text: 'a drink container', locale: 'zh' });
      assert.equal(result.channel, null);
      assert.equal(result.confidence, 0.49);
      assert.equal(result.reason, t('zh', 'classify.notSureReason'));
      assert.deepEqual(result.preparation, [t('zh', 'classify.notSurePreparation')]);
      assert.equal(result.tip, undefined);
      assert.equal(result.next_action?.type, 'check_container_type');
      assert.doesNotMatch(JSON.stringify(result), /blue|蓝色回收/i);
    });
  });

  await runTest('production is identity only and cannot execute candidate provider code', async () => {
    assert.deepEqual(Object.keys(PRODUCTION_PROFILE).sort(), ['id', 'revision']);
    assert.equal(PRODUCTION_PROFILE.id, 'production-b533bdb');
    assert.match(PRODUCTION_PROFILE.revision, /^b533bdb/);
    assert.throws(() => selectProfile('production'), /b533bdb.*worktree.*baseline:production/);
    assert.equal(selectProfile(), CANDIDATE_PROFILE);
    assert.match(profileDigest(CANDIDATE_PROFILE), /^[a-f0-9]{64}$/);
    assert.throws(() => selectProfile('other'), /Invalid/);
  });

  await runTest('core supplies the full refund copy even without TokenHub refund normalization', async () => {
    const outputs: ClassifyResult[] = [];
    await withMockFetch(async () => completionResponse(JSON.stringify({
      ...MODEL_OK, preparation: ['MODEL STEP'], tip: 'MODEL TIP',
    })), async () => {
      for (const ensureBcrsRefund of [false, true]) {
        const result = await new TokenHubProvider('test-key', { ensureBcrsRefund }).classify({ text: 'drink', locale: 'zh' });
        assert.equal(result.reason, t('zh', 'bcrs.classifyReason'));
        assert.deepEqual(result.preparation, [t('zh', 'bcrs.step1'), t('zh', 'bcrs.step2'), t('zh', 'bcrs.step3'), t('zh', 'bcrs.step4')]);
        assert.equal(result.tip, t('zh', 'bcrs.refundAmount'));
        outputs.push(result);
      }
    });
    assert.deepEqual(outputs[0], outputs[1]);
  });

  await runTest('TokenHub disables thinking on the text path', async () => {
    await withMockFetch(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        thinking: unknown;
        temperature: number;
        max_tokens: number;
        reasoning_effort?: string;
      };
      assert.equal(body.model, 'hy3');
      // A chain-of-thought bills as output, consumes max_tokens, and is what
      // turned hy3 into a 500 on 2026-08-29 with no change on this side. The
      // vendor default is not a contract, so the text path must carry this.
      assert.deepEqual(body.thinking, { type: 'disabled' });
      assert.equal(body.reasoning_effort, undefined);
      assert.equal(body.temperature, 0);
      assert.equal(body.max_tokens, 1024);
      return completionResponse(JSON.stringify(MODEL_OK));
    }, async () => {
      await new TokenHubProvider('test-key').classify({ text: 'can' });
    });
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
        async () => completionResponse(JSON.stringify(MODEL_OK), {
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
    assert.match(event, /"expectedReasoning":0/);
    assert.match(event, /"model":"hy3"/);
  });

  await runTest('text evidence is separate from pixel-reading instructions', async () => {
    const text = getClassifySystemPrompt('en', 'text');
    const image = getClassifySystemPrompt('en', 'image');
    assert.doesNotMatch(text, /read both "SG" and "RETURN" directly/);
    // Both modes report capacity; neither infers it from a product's usual retail size.
    for (const prompt of [text, image]) {
      assert.match(prompt, /stated or printed capacity or a visibly evident size; otherwise unknown/);
      assert.doesNotMatch(prompt, /common retail size/);
    }
    assert.doesNotMatch(text.slice(text.indexOf('15. **BCRS')), /empty plastic water bottle|ordinary can of soda|100ml cultured|5L water bottle/i);
  });

  await runTest('missing structured evidence cannot silently remove next-step guidance', async () => {
    const raw = { ...MODEL_OK } as Record<string, unknown>;
    delete raw.beverage_evidence;
    await withMockFetch(async () => completionResponse(JSON.stringify(raw)), async () => {
      await assert.rejects(new TokenHubProvider('test-key').classify({ text: 'water bottle' }), RetryableProviderError);
    });
  });

  await runTest('image reasoning is expected, not a contract violation', async () => {
    for (const reasoning of [130, 2_000]) {
      const lines: string[] = [];
      const original = { log: console.log, warn: console.warn, info: console.info };
      console.log = (...args: unknown[]) => { lines.push(args.join(' ')); };
      console.warn = () => {};
      console.info = () => {};
      try {
        await withMockFetch(async () => completionResponse(JSON.stringify(MODEL_OK), {
          prompt_tokens: 4000, completion_tokens: reasoning + 250,
          completion_tokens_details: { reasoning_tokens: reasoning },
        }), async () => {
          const result = await new TokenHubProvider('test-key').classify({ image: TEST_JPEG_BASE64 });
          assert.equal(result.channel, 'return_point');
        });
      } finally {
        Object.assign(console, original);
      }
      assert.ok(!lines.some((line) => line.includes('"evt":"provider_contract"')), `reasoning=${reasoning}`);
    }
  });

  await runTest('only an answer the model finished itself is accepted, on both paths', async () => {
    const body = (choice: Record<string, unknown>, usage?: unknown) => () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(MODEL_OK) }, ...choice }],
      ...(usage === undefined ? {} : { usage }),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    // Parseable JSON is not enough: a completion cut off at the cap is not an
    // answer the model ended, and the cut may have removed a field.
    const unfinished: Array<[string, () => Response, RegExp]> = [
      ['length', body({ finish_reason: 'length' }, { prompt_tokens: 1000, completion_tokens: 1024 }), /"finish":"length".*"out":1024|"out":1024.*"finish":"length"/],
      ['content_filter', body({ finish_reason: 'content_filter' }), /"finish":"content_filter"/],
      ['null', body({ finish_reason: null }), /"finish":null/],
      ['missing', body({}), /"finish":null/],
    ];
    for (const request of [{ text: 'can' }, { image: TEST_JPEG_BASE64 }] as ClassifyRequest[]) {
      for (const [label, response, recorded] of unfinished) {
        const lines: string[] = [];
        const original = { log: console.log, warn: console.warn, info: console.info };
        console.log = (...args: unknown[]) => { lines.push(args.join(' ')); };
        console.warn = () => {};
        console.info = () => {};
        try {
          await withMockFetch(async () => response(), async () => {
            await assert.rejects(new TokenHubProvider('test-key').classify(request), (err: unknown) => {
              assert.ok(err instanceof RetryableProviderError, label);
              assert.match(err.message, /did not finish the answer/, label);
              return true;
            });
          });
        } finally {
          Object.assign(console, original);
        }
        const event = lines.find((line) => line.includes('"evt":"provider_contract"'));
        assert.ok(event, `${label}: an unfinished answer must reach the event stream`);
        assert.match(event, /"issue":"unfinished_completion"/, label);
        assert.match(event, recorded, label);
      }
    }
  });

  await runTest('the candidate profile sends exactly the request its digest binds', async () => {
    const options = CANDIDATE_PROFILE.providerOptions;
    for (const [request, model, expected] of [
      [{ text: 'can' }, options.textModel, { ...TOKENHUB_TEXT_REQUEST, temperature: options.textTemperature }],
      [{ image: TEST_JPEG_BASE64 }, options.visionModel, TOKENHUB_VISION_REQUEST],
    ] as Array<[ClassifyRequest, string, Record<string, unknown>]>) {
      await withMockFetch(async (_input, init) => {
        const sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
        assert.equal(sent.model, model);
        const sampling = Object.fromEntries(Object.entries(sent)
          .filter(([key]) => !['model', 'messages', 'response_format'].includes(key)));
        assert.deepEqual(sampling, JSON.parse(JSON.stringify(expected)));
        return completionResponse(JSON.stringify(MODEL_OK));
      }, async () => {
        await new TokenHubProvider('test-key', options).classify(request);
      });
    }
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

  await runTest('TokenHub derives the status from the channel', async () => {
    const laptop = {
      ...MODEL_OK, item: 'laptop', channel: 'ewaste', reason: 'ICT equipment.',
      beverage_evidence: { ...EVIDENCE, beverage_product: 'other', subject: 'other', form: 'other', material: 'other' },
    };
    for (const [answer, status] of [[laptop, 'special_handling'], [{ ...laptop, channel: null, confidence: 0.3 }, 'not_sure']] as const) {
      await withMockFetch(async () => completionResponse(JSON.stringify(answer)), async () => {
        assert.equal((await new TokenHubProvider('test-key').classify({ text: 'laptop' })).status, status);
      });
    }
  });

  await runTest('an answer that states its own status ignored the schema and is retried', async () => {
    // A stated status could contradict the channel; it is rejected, never overwritten.
    await withMockFetch(
      async () => completionResponse(JSON.stringify({ ...MODEL_OK, status: 'special_handling' })),
      async () => {
        await assert.rejects(
          new TokenHubProvider('test-key').classify({ text: 'can' }),
          (err: unknown) => err instanceof RetryableProviderError && /status is derived/.test(err.message),
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

  await runTest('an unfinished answer is retried like any transient failure', async () => {
    let calls = 0;
    const original = { log: console.log, warn: console.warn, info: console.info };
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    try {
      await withMockFetch(async () => {
        calls += 1;
        return completionResponse(JSON.stringify(MODEL_OK), undefined, calls === 1 ? 'length' : 'stop');
      }, async () => {
        const result = await classifyItem({ text: 'can' }, new TokenHubProvider('test-key'),
          { ...DEFAULT_EXECUTION_POLICY, retryBackoffMs: 0 });
        assert.equal(result.channel, 'return_point');
      });
    } finally {
      Object.assign(console, original);
    }
    assert.equal(calls, 2);
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
    assert.ok(BUDGET_MS({ image: 'x' }) > ATTEMPT_MS({ image: 'x' }));
    assert.ok(BUDGET_MS({ text: 'can' }) > ATTEMPT_MS({ text: 'can' }), 'budget must allow a retry');
  });

  const blueBin: ClassifyResult = { ...OK, channel: 'blue_bin', reason: 'Clean metal can.' };
  const generalWaste: ClassifyResult = { ...OK, status: 'not_recyclable', channel: 'general_waste', reason: 'Sachet.' };

  await runTest('an image answers as soon as two of three parallel samples agree', async () => {
    const provider = stub(['ok', 'ok', 5_000]);
    const started = Date.now();
    const result = await classifyItem({ image: 'x' }, provider);
    assert.equal(result.channel, 'return_point');
    assert.equal(provider.calls, 3, 'all samples start together');
    assert.ok(Date.now() - started < 1_000, 'the slowest sample must not hold the answer');
  });

  await runTest('text still takes a single sample', async () => {
    const provider = answers([OK, blueBin]);
    assert.equal((await classifyItem({ text: 'can' }, provider)).channel, 'return_point');
    assert.equal(provider.calls, 1);
  });

  await runTest('an image follows the majority when two samples disagree', async () => {
    const provider = answers([OK, blueBin, OK]);
    const result = await classifyItem({ image: 'x' }, provider);
    assert.equal(result.channel, 'return_point');
    assert.equal(provider.calls, 3);
  });

  await runTest('an image without a majority answers not_sure, preferring a sample that said so', async () => {
    const split = await classifyItem({ image: 'x', locale: 'en' }, answers([OK, blueBin, generalWaste]));
    assert.equal(split.status, 'not_sure');
    assert.equal(split.channel, null);
    assert.equal(split.reason, t('en', 'classify.notSureReason'));
    const unsure: ClassifyResult = { ...OK, status: 'not_sure', channel: null, confidence: 0.3, reason: 'Size unknown.' };
    const preferred = await classifyItem({ image: 'x' }, answers([OK, blueBin, unsure]));
    assert.equal(preferred.reason, 'Size unknown.');
  });

  await runTest('one sample that cannot be drawn leaves the other two to decide', async () => {
    const agreeing = stub(['ok', new Error('TokenHub API error: 401'), 'ok']);
    assert.equal((await classifyItem({ image: 'x' }, agreeing)).channel, 'return_point');
    let calls = 0;
    const split: ClassifyProvider = {
      name: 'split',
      async classify() {
        calls += 1;
        if (calls === 3) throw new Error('TokenHub API error: 401');
        return calls === 1 ? OK : blueBin;
      },
    };
    assert.equal((await classifyItem({ image: 'x' }, split)).status, 'not_sure');
  });

  await runTest('an image fails like a single classification when fewer than two samples can be drawn', async () => {
    const failure = new Error('TokenHub API error: 401');
    await assert.rejects(classifyItem({ image: 'x' }, stub([failure, failure, 'ok'])));
  });

  await runTest('an image vote stays inside the image budget', async () => {
    const policy = {
      ...DEFAULT_EXECUTION_POLICY, imageAttemptMs: 40, imageBudgetMs: 100, minAttemptMs: 10, retryBackoffMs: 0,
    };
    const provider = stub(Array.from({ length: 12 }, () => 1_000));
    const started = Date.now();
    await assert.rejects(classifyItem({ image: 'x' }, provider, policy));
    assert.ok(Date.now() - started <= policy.imageBudgetMs + 100, 'the vote must end at the image budget');
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
