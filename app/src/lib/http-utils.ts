import type { ApiErrorCode } from '@binwhere/core';

/**
 * Streaming JSON body reader with size limit enforcement.
 * Next.js App Router ignores `api.bodyParser.sizeLimit` in next.config,
 * so we enforce the limit ourselves by reading the body as a stream.
 */

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ApiErrorCode = 'INVALID_INPUT',
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Read and parse JSON body from a Request, enforcing a byte-size limit.
 * Throws HttpError(413) if body exceeds maxBytes.
 * Throws HttpError(400) if body is not valid JSON.
 */
export async function readJsonBodyWithLimit<T = unknown>(
  request: Request,
  maxBytes: number,
): Promise<T> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new HttpError('Image too large', 413, 'IMAGE_TOO_LARGE');
  }

  const reader = request.body?.getReader();
  if (!reader) {
    throw new HttpError('Missing request body', 400, 'INVALID_INPUT');
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        throw new HttpError('Image too large', 413, 'IMAGE_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const decoder = new TextDecoder();
  const text = chunks.map((c) => decoder.decode(c, { stream: true })).join('') +
    decoder.decode();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError('Invalid JSON body', 400, 'INVALID_INPUT');
  }
}
