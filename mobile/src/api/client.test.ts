import assert from 'node:assert/strict';
import {
  ApiError,
  DEFAULT_API_BASE,
  buildClassifyBody,
  buildClassifyUrl,
  buildNearbyQueryString,
  buildNearbyUrl,
  classifyItem,
  getApiBaseUrl,
} from './client';

function run(name: string, test: () => void) {
  test();
  console.log(`PASS ${name}`);
}

async function runAsync(name: string, test: () => Promise<void>) {
  await test();
  console.log(`PASS ${name}`);
}

async function withFetch(
  fetchImpl: typeof fetch,
  test: () => Promise<void>,
): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    await test();
  } finally {
    globalThis.fetch = original;
  }
}

run('getApiBaseUrl defaults to production host without trailing slash', () => {
  const url = getApiBaseUrl({});
  assert.equal(url, DEFAULT_API_BASE);
  assert.equal(url.endsWith('/'), false);
});

run('getApiBaseUrl strips all trailing slashes from an override', () => {
  assert.equal(
    getApiBaseUrl({ EXPO_PUBLIC_API_BASE_URL: 'https://example.com///' }),
    'https://example.com',
  );
});

run('buildClassifyUrl uses the versioned classify contract', () => {
  assert.equal(
    buildClassifyUrl('https://binwhere.sg'),
    'https://binwhere.sg/api/v1/classify',
  );
});

run('buildClassifyBody validates and preserves the text request', () => {
  const body = buildClassifyBody({ text: 'plastic bottle', locale: 'zh' });
  assert.deepEqual(body, { text: 'plastic bottle', locale: 'zh' });
});

run('buildClassifyBody rejects an empty request', () => {
  assert.throws(() => buildClassifyBody({ locale: 'en' }));
});

run('buildNearbyQueryString applies the v1 defaults and filters', () => {
  const query = buildNearbyQueryString({
    lat: 1.35,
    lng: 103.82,
    channel: 'blue_bin',
    limit: 5,
    acceptedItem: 'Clothing',
  });
  const params = new URLSearchParams(query);
  assert.equal(params.get('lat'), '1.35');
  assert.equal(params.get('lng'), '103.82');
  assert.equal(params.get('channel'), 'blue_bin');
  assert.equal(params.get('limit'), '5');
  assert.equal(params.get('radius'), '1');
  assert.equal(params.get('acceptedItem'), 'Clothing');
});

run('buildNearbyUrl composes the versioned nearby endpoint', () => {
  const url = buildNearbyUrl(
    { lat: 1.3, lng: 103.8, channel: 'return_point', limit: 20 },
    'https://binwhere.sg',
  );
  assert.ok(url.startsWith('https://binwhere.sg/api/v1/nearby?'));
});

async function runNetworkContractTests() {
  await runAsync('classifyItem parses a valid response at runtime', async () => {
  await withFetch(
    async () => new Response(JSON.stringify({
      item: 'Bottle',
      status: 'recyclable',
      confidence: 0.9,
      channel: 'blue_bin',
      reason: 'Accepted',
      preparation: ['Rinse'],
    }), { status: 200 }),
    async () => {
      const result = await classifyItem({ text: 'bottle', locale: 'en' });
      assert.equal(result.channel, 'blue_bin');
      assert.deepEqual(result.preparation, ['Rinse']);
    },
  );
  });

  await runAsync('classifyItem exposes invalid client input as a stable error', async () => {
    await assert.rejects(
      () => classifyItem({ locale: 'en' }),
      (error: unknown) => error instanceof ApiError
        && error.status === 400
        && error.code === 'INVALID_INPUT',
    );
  });

  await runAsync('classifyItem preserves a stable server error code', async () => {
    await withFetch(
      async () => new Response(JSON.stringify({
        code: 'RATE_LIMITED',
        error: 'Too many requests',
      }), { status: 429 }),
      async () => {
        await assert.rejects(
          () => classifyItem({ text: 'bottle', locale: 'en' }),
          (error: unknown) => error instanceof ApiError
            && error.status === 429
            && error.code === 'RATE_LIMITED',
        );
      },
    );
  });

  await runAsync('classifyItem rejects a malformed success payload', async () => {
    await withFetch(
      async () => new Response(JSON.stringify({ item: 'Bottle' }), { status: 200 }),
      async () => {
        await assert.rejects(
          () => classifyItem({ text: 'bottle', locale: 'en' }),
          (error: unknown) => error instanceof ApiError
            && error.code === 'INVALID_RESPONSE',
        );
      },
    );
  });

  await runAsync('classifyItem rejects a malformed error envelope', async () => {
    await withFetch(
      async () => new Response('<html>error</html>', { status: 500 }),
      async () => {
        await assert.rejects(
          () => classifyItem({ text: 'bottle', locale: 'en' }),
          (error: unknown) => error instanceof ApiError
            && error.status === 500
            && error.code === 'INVALID_RESPONSE',
        );
      },
    );
  });

  console.log('All client tests passed');
}

runNetworkContractTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
