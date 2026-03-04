import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { classifyItem } from '@/lib/ai/provider';
import { checkRateLimit, CLASSIFY_LIMITS } from '@/lib/rate-limit';
import { readJsonBodyWithLimit, HttpError } from '@/lib/http-utils';
import {
  validateAndSanitizeImage,
  MAX_IMAGE_BASE64_LENGTH,
  MAX_JSON_BODY_BYTES,
} from '@/lib/image-security';

const ClassifyInputSchema = z.object({
  image: z.string().max(MAX_IMAGE_BASE64_LENGTH).optional(),
  text: z.string().max(500).optional(),
  locale: z.enum(['en', 'zh', 'ms', 'ta']).default('en'),
}).refine((d) => d.image || d.text, {
  message: 'Either image or text is required',
});

export async function POST(request: NextRequest) {
  const blocked = checkRateLimit(request, CLASSIFY_LIMITS);
  if (blocked) return blocked;

  try {
    const body = await readJsonBodyWithLimit(request, MAX_JSON_BODY_BYTES);
    const input = ClassifyInputSchema.parse(body);

    // Validate and sanitize image if present
    let cleanImage: string | undefined;
    if (input.image) {
      cleanImage = await validateAndSanitizeImage(input.image);
    }

    const result = await classifyItem({
      image: cleanImage,
      text: input.text,
      locale: input.locale,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 },
      );
    }

    console.error('[api/classify] Error:', error);
    return NextResponse.json(
      { error: 'Classification failed' },
      { status: 500 },
    );
  }
}
