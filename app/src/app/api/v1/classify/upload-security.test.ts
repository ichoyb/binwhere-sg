import assert from 'node:assert/strict';

import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { ApiErrorResponseSchema } from '@binwhere/core';

import { POST } from './route';
import {
  IMAGE_SANITIZATION_CONTRACT,
  MAX_IMAGE_BASE64_LENGTH,
  MAX_JSON_BODY_BYTES,
  validateAndSanitizeImage,
} from '@/lib/image-security';
import { HttpError, readJsonBodyWithLimit } from '@/lib/http-utils';

async function runTest(name: string, test: () => Promise<void>) {
  await test();
  console.log(`PASS ${name}`);
}

async function expectHttpError(
  action: () => Promise<unknown>,
  status: number,
  code: string,
) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof HttpError);
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    return true;
  });
}

let clientCounter = 0;

function classifyRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  clientCounter += 1;
  return new NextRequest('https://binwhere.sg/api/v1/classify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://binwhere.sg',
      'cf-connecting-ip': `198.51.100.${clientCounter}`,
      ...headers,
    },
    body,
  });
}

async function assertApiError(response: Response, status: number, code: string) {
  assert.equal(response.status, status);
  assert.equal(ApiErrorResponseSchema.parse(await response.json()).code, code);
}

async function encodedImage(format: 'jpeg' | 'png' | 'webp'): Promise<string> {
  const image = sharp({
    create: {
      width: 48,
      height: 32,
      channels: 4,
      background: { r: 10, g: 80, b: 140, alpha: 0.5 },
    },
  });
  return (await image[format]().toBuffer()).toString('base64');
}

async function main() {
  await runTest('streaming JSON reader accepts a body at its byte limit', async () => {
    const body = JSON.stringify({ value: '四语' });
    const request = new Request('https://binwhere.sg/api/v1/classify', {
      method: 'POST',
      body,
    });
    assert.deepEqual(
      await readJsonBodyWithLimit(request, Buffer.byteLength(body)),
      { value: '四语' },
    );
  });

  await runTest('streaming JSON reader rejects actual bytes over the limit', async () => {
    const request = new Request('https://binwhere.sg/api/v1/classify', {
      method: 'POST',
      body: JSON.stringify({ image: 'A'.repeat(64) }),
    });
    await expectHttpError(
      () => readJsonBodyWithLimit(request, 32),
      413,
      'IMAGE_TOO_LARGE',
    );
  });

  await runTest('JPEG, PNG and WebP inputs are decoded and re-encoded as clean JPEG', async () => {
    for (const format of ['jpeg', 'png', 'webp'] as const) {
      const clean = Buffer.from(
        await validateAndSanitizeImage(await encodedImage(format)),
        'base64',
      );
      const metadata = await sharp(clean).metadata();
      assert.equal(metadata.format, 'jpeg');
      assert.ok((metadata.width ?? 0) <= IMAGE_SANITIZATION_CONTRACT.output.maxDimension);
      assert.ok((metadata.height ?? 0) <= IMAGE_SANITIZATION_CONTRACT.output.maxDimension);
      assert.equal(metadata.exif, undefined);
    }
  });

  await runTest('sanitiser preserves detail up to the classification dimension contract', async () => {
    const source = await sharp({
      create: {
        width: 3000,
        height: 1200,
        channels: 3,
        background: { r: 10, g: 80, b: 140 },
      },
    }).jpeg().toBuffer();
    const clean = Buffer.from(
      await validateAndSanitizeImage(source.toString('base64')),
      'base64',
    );
    const metadata = await sharp(clean).metadata();
    assert.equal(metadata.width, IMAGE_SANITIZATION_CONTRACT.output.maxDimension);
    assert.equal(metadata.height, 819);
  });

  await runTest('unsupported data URI MIME is rejected', async () => {
    await expectHttpError(
      () => validateAndSanitizeImage(`data:image/gif;base64,${'A'.repeat(128)}`),
      400,
      'INVALID_IMAGE',
    );
  });

  await runTest('malformed base64 is rejected', async () => {
    await expectHttpError(
      () => validateAndSanitizeImage('!'.repeat(128)),
      400,
      'INVALID_IMAGE',
    );
  });

  await runTest('a forged PNG signature with corrupt contents is rejected as client input', async () => {
    const forged = Buffer.alloc(128);
    Buffer.from([0x89, 0x50, 0x4e, 0x47]).copy(forged);
    await expectHttpError(
      () => validateAndSanitizeImage(forged.toString('base64')),
      400,
      'INVALID_IMAGE',
    );
  });

  await runTest('decoded image payload over 5 MiB is rejected before decoding', async () => {
    await expectHttpError(
      () => validateAndSanitizeImage('A'.repeat(MAX_IMAGE_BASE64_LENGTH)),
      413,
      'IMAGE_TOO_LARGE',
    );
  });

  await runTest('image dimension over 4096 pixels is rejected', async () => {
    const oversized = await sharp({
      create: {
        width: 4097,
        height: 1,
        channels: 3,
        background: '#ffffff',
      },
    }).png().toBuffer();
    await expectHttpError(
      () => validateAndSanitizeImage(oversized.toString('base64')),
      400,
      'INVALID_IMAGE',
    );
  });

  await runTest('decompression-bomb pixel count is rejected', async () => {
    const oversized = await sharp({
      create: {
        width: 3000,
        height: 3000,
        channels: 3,
        background: '#ffffff',
      },
    }).png().toBuffer();
    await expectHttpError(
      () => validateAndSanitizeImage(oversized.toString('base64')),
      400,
      'INVALID_IMAGE',
    );
  });

  await runTest('route rejects declared oversized body before parsing or provider use', async () => {
    let providerCalls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      providerCalls += 1;
      throw new Error('provider must not be called');
    };
    try {
      const response = await POST(classifyRequest(
        JSON.stringify({ text: 'newspaper' }),
        { 'content-length': String(MAX_JSON_BODY_BYTES + 1) },
      ));
      await assertApiError(response, 413, 'IMAGE_TOO_LARGE');
      assert.equal(providerCalls, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await runTest('route rejects a corrupt image without spending a provider call', async () => {
    const forged = Buffer.alloc(128);
    Buffer.from([0xff, 0xd8, 0xff]).copy(forged);
    let providerCalls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      providerCalls += 1;
      throw new Error('provider must not be called');
    };
    try {
      const response = await POST(classifyRequest(JSON.stringify({
        image: forged.toString('base64'),
        locale: 'en',
      })));
      await assertApiError(response, 400, 'INVALID_IMAGE');
      assert.equal(providerCalls, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
