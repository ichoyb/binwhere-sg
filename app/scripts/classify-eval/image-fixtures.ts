import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { BcrsImageSource } from './bcrs-test-cases';

export const CACHE_DIR = path.join(__dirname, 'fixtures', 'cache');
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const SOURCE_DOWNLOAD_MS = 20_000;
const sha256 = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

async function downloadSource(source: BcrsImageSource, cacheDirectory: string): Promise<Buffer> {
  const response = await fetch(source.imageUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(SOURCE_DOWNLOAD_MS),
    headers: { 'User-Agent': 'BinWhere-BCRS-Regression/1.0' },
  });
  if (!response.ok) {
    throw new Error(`Image download failed with HTTP ${response.status}: ${source.sourcePageUrl}`);
  }

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) {
    throw new Error(`Image source exceeds ${MAX_SOURCE_BYTES} bytes: ${source.id}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_SOURCE_BYTES) {
    throw new Error(`Downloaded image exceeds ${MAX_SOURCE_BYTES} bytes: ${source.id}`);
  }
  const actualHash = sha256(buffer);
  if (actualHash !== source.sha256) {
    throw new Error(
      `Image source changed for ${source.id}: expected ${source.sha256}, received ${actualHash}. ` +
      'Review the source again before updating the manifest.',
    );
  }

  fs.mkdirSync(cacheDirectory, { recursive: true });
  fs.writeFileSync(path.join(cacheDirectory, source.filename), buffer);
  return buffer;
}

export async function loadSource(source: BcrsImageSource, cacheDirectory = CACHE_DIR): Promise<Buffer> {
  const cachePath = path.join(cacheDirectory, source.filename);
  if (fs.existsSync(cachePath)) {
    const cached = fs.readFileSync(cachePath);
    if (sha256(cached) === source.sha256) return cached;
    console.warn(`[fixture] Cached bytes failed hash verification; refreshing ${source.id}`);
  }
  console.log(`[fixture] Downloading real photo: ${source.id}`);
  return downloadSource(source, cacheDirectory);
}
