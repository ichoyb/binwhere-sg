import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { classifyItem } from '@/lib/ai/provider';
import { checkRateLimit, CLASSIFY_LIMITS } from '@/lib/rate-limit';

const ClassifyInputSchema = z.object({
  /** Base64-encoded image (max ~7.5MB) */
  image: z.string().max(10_000_000).optional(),
  /** Text description */
  text: z.string().max(500).optional(),
  /** User locale */
  locale: z.enum(['en', 'zh', 'ms', 'ta']).default('en'),
}).refine((d) => d.image || d.text, {
  message: 'Either image or text is required',
});

export async function POST(request: NextRequest) {
  const blocked = checkRateLimit(request, CLASSIFY_LIMITS);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const input = ClassifyInputSchema.parse(body);

    const result = await classifyItem({
      image: input.image,
      text: input.text,
      locale: input.locale,
    });

    return NextResponse.json(result);
  } catch (error) {
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
