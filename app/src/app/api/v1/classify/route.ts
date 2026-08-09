import { NextRequest, NextResponse } from 'next/server';
import {
  ClassifyRequestSchema,
  ClassifyResultSchema,
  type ApiErrorCode,
} from '@binwhere/core';
import { classifyItem } from '@/lib/ai/provider';
import { checkRateLimit, CLASSIFY_LIMITS } from '@/lib/rate-limit';
import { readJsonBodyWithLimit, HttpError } from '@/lib/http-utils';
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
  const blocked = checkRateLimit(request, CLASSIFY_LIMITS);
  if (blocked) return blocked;

  try {
    const body = await readJsonBodyWithLimit(request, MAX_JSON_BODY_BYTES);
    const parsedInput = ClassifyRequestSchema.safeParse(body);
    if (!parsedInput.success) {
      return errorResponse(
        'INVALID_INPUT',
        'Invalid input',
        400,
        parsedInput.error.issues,
      );
    }
    const input = parsedInput.data;

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
      return errorResponse(
        'INVALID_RESPONSE',
        'Invalid classification response',
        502,
      );
    }

    return NextResponse.json(parsedResult.data);
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.code, error.message, error.status);
    }

    console.error('[api/v1/classify] Error:', error);
    return errorResponse(
      'CLASSIFICATION_FAILED',
      'Classification failed',
      500,
    );
  }
}
