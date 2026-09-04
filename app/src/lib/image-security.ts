/**
 * Image validation and sanitization pipeline.
 * Accepts untrusted base64 input, validates format and content,
 * then re-encodes through sharp to produce a clean JPEG.
 */

import sharp from 'sharp';
import pLimit from 'p-limit';
import { MAX_CLASSIFY_IMAGE_BASE64_LENGTH } from '@binwhere/core';
import { HttpError } from './http-utils';

// --- Constants ---

/** Maximum base64 string length accepted (~5MB decoded) */
export const MAX_IMAGE_BASE64_LENGTH = MAX_CLASSIFY_IMAGE_BASE64_LENGTH;

/** Maximum JSON body size in bytes (base64 + text + overhead) */
export const MAX_JSON_BODY_BYTES = 8_000_000;

/** Output-affecting contract bound into classification release evidence. */
export const IMAGE_SANITIZATION_CONTRACT = {
  version: 1,
  allowedFormats: ['jpeg', 'png', 'webp'],
  allowedDataUriMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  maxDecodedBytes: 5 * 1024 * 1024,
  maxDimension: 4096,
  maxInputPixels: 8_000_000,
  output: {
    format: 'jpeg',
    maxDimension: 1024,
    fit: 'inside',
    withoutEnlargement: true,
    autoOrient: true,
    flattenBackground: '#ffffff',
    quality: 70,
  },
} as const;

const MAX_QUEUE_LENGTH = 24;

const ALLOWED_FORMATS = new Set<string>(IMAGE_SANITIZATION_CONTRACT.allowedFormats);
const ALLOWED_DATA_URI_MIMES = new Set<string>(
  IMAGE_SANITIZATION_CONTRACT.allowedDataUriMimes,
);

// Strict base64: A-Za-z0-9+/ with optional 0-2 trailing '='
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

// Magic bytes for format detection
const MAGIC_BYTES: Array<{ format: string; bytes: number[] }> = [
  { format: 'jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { format: 'png', bytes: [0x89, 0x50, 0x4E, 0x47] },
  // WebP: starts with RIFF....WEBP
  { format: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

// --- Concurrency control ---

const processLimit = pLimit(2);
sharp.concurrency(1);

// --- Pipeline ---

/**
 * Validate and sanitize an untrusted base64 image string.
 * Returns a clean base64-encoded JPEG safe for AI processing.
 *
 * Pipeline:
 * 1. Strip data URI prefix, validate MIME
 * 2. Strict base64 regex check
 * 3. Size pre-check (estimated decoded size ≤ 5MB)
 * 4. Decode to Buffer
 * 5. Magic bytes verification
 * 6. Concurrency-limited sharp processing:
 *    a. Decode with strict settings
 *    b. Metadata validation (format whitelist, dimension limit)
 *    c. Re-encode: rotate → resize → flatten → JPEG
 * 7. Return clean base64
 */
export async function validateAndSanitizeImage(
  rawBase64: string,
): Promise<string> {
  // Step 1: Strip data URI prefix
  let base64 = rawBase64;
  const dataUriMatch = base64.match(
    /^data:(image\/[a-zA-Z+]+);base64,/,
  );
  if (dataUriMatch) {
    const mime = dataUriMatch[1].toLowerCase();
    if (!ALLOWED_DATA_URI_MIMES.has(mime)) {
      throw new HttpError('Invalid image', 400, 'INVALID_IMAGE');
    }
    base64 = base64.slice(dataUriMatch[0].length);
  }

  // Step 2: Strict base64 validation
  if (!base64 || base64.length < 100 || !BASE64_REGEX.test(base64)) {
    throw new HttpError('Invalid image', 400, 'INVALID_IMAGE');
  }

  // Step 3: Size pre-check (base64 is ~4/3 of decoded size)
  const estimatedBytes = Math.ceil(base64.length * 3 / 4);
  if (estimatedBytes > IMAGE_SANITIZATION_CONTRACT.maxDecodedBytes) {
    throw new HttpError('Image too large', 413, 'IMAGE_TOO_LARGE');
  }

  // Step 4: Decode
  const buffer = Buffer.from(base64, 'base64');

  // Step 5: Magic bytes check
  if (!checkMagicBytes(buffer)) {
    throw new HttpError('Invalid image', 400, 'INVALID_IMAGE');
  }

  // Step 6: Concurrency-limited sharp processing
  if (processLimit.pendingCount > MAX_QUEUE_LENGTH) {
    throw new HttpError('Server busy', 503, 'SERVER_BUSY');
  }

  const cleanBuffer = await processLimit(() => processImage(buffer));

  // Step 7: Return clean base64
  return cleanBuffer.toString('base64');
}

function checkMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  for (const { format, bytes } of MAGIC_BYTES) {
    const matches = bytes.every((b, i) => buffer[i] === b);
    if (matches) {
      // Extra check for WebP: bytes 8-11 must be "WEBP"
      if (format === 'webp') {
        return (
          buffer[8] === 0x57 && // W
          buffer[9] === 0x45 && // E
          buffer[10] === 0x42 && // B
          buffer[11] === 0x50 // P
        );
      }
      return true;
    }
  }

  return false;
}

async function processImage(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer, {
      failOn: 'error',
      limitInputPixels: IMAGE_SANITIZATION_CONTRACT.maxInputPixels,
      sequentialRead: true,
    });

    // Metadata validation
    const metadata = await image.metadata();

    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      throw new HttpError('Invalid image', 400, 'INVALID_IMAGE');
    }

    if (
      (metadata.width && metadata.width > IMAGE_SANITIZATION_CONTRACT.maxDimension) ||
      (metadata.height && metadata.height > IMAGE_SANITIZATION_CONTRACT.maxDimension)
    ) {
      throw new HttpError('Invalid image', 400, 'INVALID_IMAGE');
    }

    // Re-encode: auto-rotate EXIF → resize → flatten alpha → JPEG
    return await image
      .rotate()
      .resize(
        IMAGE_SANITIZATION_CONTRACT.output.maxDimension,
        IMAGE_SANITIZATION_CONTRACT.output.maxDimension,
        {
          fit: IMAGE_SANITIZATION_CONTRACT.output.fit,
          withoutEnlargement: IMAGE_SANITIZATION_CONTRACT.output.withoutEnlargement,
        },
      )
      .flatten({ background: IMAGE_SANITIZATION_CONTRACT.output.flattenBackground })
      .jpeg({ quality: IMAGE_SANITIZATION_CONTRACT.output.quality })
      .toBuffer();
  } catch (error) {
    if (error instanceof HttpError) throw error;

    // A caller-controlled payload that advertises an allowed format but cannot be
    // decoded is still invalid input. Do not turn corrupt-image parser errors into
    // a 500 or expose Sharp's decoder details through the public API.
    throw new HttpError('Invalid image', 400, 'INVALID_IMAGE');
  }
}
