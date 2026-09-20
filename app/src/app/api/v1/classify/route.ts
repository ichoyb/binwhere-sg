import { NextRequest, NextResponse } from 'next/server';
import {
  ClassifyRequestSchema,
  ClassifyResultSchema,
  type ApiErrorCode,
} from '@binwhere/core';
import { classifyItem } from '@/lib/ai/provider';
import { checkRateLimit, CLASSIFY_LIMITS } from '@/lib/rate-limit';
import { readJsonBodyWithLimit, HttpError } from '@/lib/http-utils';
import { clientId, logEvent } from '@/lib/telemetry';
import {
  validateAndSanitizeImage,
  MAX_JSON_BODY_BYTES,
} from '@/lib/image-security';

function errorResponse(
  code: ApiErrorCode,
  error: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    { code, error, ...(details === undefined ? {} : { details }) },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const client = clientId(request);
  const elapsed = () => Date.now() - startedAt;

  // Carried outside the try so failures are still attributable to a mode/locale.
  let mode: 'image' | 'text' | undefined;
  let locale: string | undefined;

  const blocked = checkRateLimit(request, CLASSIFY_LIMITS);
  if (blocked) {
    // A throttled or blocked caller used to leave no trace at all: the user saw
    // a broken feature and the server recorded nothing.
    logEvent('classify', {
      client,
      ok: false,
      http: blocked.status,
      code: blocked.status === 403 ? 'FORBIDDEN' : 'RATE_LIMITED',
      ms: elapsed(),
    });
    return blocked;
  }

  try {
    const body = await readJsonBodyWithLimit(request, MAX_JSON_BODY_BYTES);
    const parsedInput = ClassifyRequestSchema.safeParse(body);
    if (!parsedInput.success) {
      logEvent('classify', {
        client,
        ok: false,
        http: 400,
        code: 'INVALID_INPUT',
        ms: elapsed(),
      });
      return errorResponse(
        'INVALID_INPUT',
        'Invalid input',
        400,
        parsedInput.error.issues,
      );
    }
    const input = parsedInput.data;
    mode = input.image ? 'image' : 'text';
    locale = input.locale;

    const cleanImage = input.image
      ? await validateAndSanitizeImage(input.image)
      : undefined;

    const result = await classifyItem({
      image: cleanImage,
      text: input.text,
      locale: input.locale,
    });

    const parsedResult = ClassifyResultSchema.safeParse(result);
    if (!parsedResult.success) {
      console.error(
        '[api/v1/classify] Invalid provider result:',
        parsedResult.error.issues,
      );
      logEvent('classify', {
        client,
        ok: false,
        http: 502,
        code: 'INVALID_RESPONSE',
        mode,
        locale,
        ms: elapsed(),
      });
      return errorResponse(
        'INVALID_RESPONSE',
        'Invalid classification response',
        502,
      );
    }

    // confidence and channel are the product signal: an access log sees only 200.
    logEvent('classify', {
      client,
      ok: true,
      http: 200,
      mode,
      locale,
      channel: parsedResult.data.channel,
      status: parsedResult.data.status,
      confidence: parsedResult.data.confidence,
      nextAction: parsedResult.data.next_action?.type,
      ms: elapsed(),
    });
    return NextResponse.json(parsedResult.data);
  } catch (error) {
    if (error instanceof HttpError) {
      logEvent('classify', {
        client,
        ok: false,
        http: error.status,
        code: error.code,
        mode,
        locale,
        ms: elapsed(),
      });
      return errorResponse(error.code, error.message, error.status);
    }

    console.error('[api/v1/classify] Error:', error);
    logEvent('classify', {
      client,
      ok: false,
      http: 500,
      code: 'CLASSIFICATION_FAILED',
      mode,
      locale,
      ms: elapsed(),
    });
    return errorResponse(
      'CLASSIFICATION_FAILED',
      'Classification failed',
      500,
    );
  }
}
