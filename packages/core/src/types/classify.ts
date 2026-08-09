import { z } from 'zod';
import { LocaleSchema } from '../i18n/types';
import { ChannelTypeSchema, ClassifyStatusSchema } from './recycling';

export const MAX_CLASSIFY_IMAGE_BASE64_LENGTH = 7_000_000;
export const MAX_CLASSIFY_TEXT_LENGTH = 500;

/** Zod schema for AI classification result */
export const ClassifyResultSchema = z.object({
  /** Identified item name */
  item: z.string().trim().min(1),
  /** Recycling status */
  status: ClassifyStatusSchema,
  /** Confidence score 0-1 */
  confidence: z.number().min(0).max(1),
  /** Which recycling channel to use */
  channel: ChannelTypeSchema.nullable(),
  /** Why this classification was made */
  reason: z.string().trim().min(1),
  /** How to prepare the item for recycling (step-by-step) */
  preparation: z.array(z.string().trim()).optional().transform((steps) => {
    const cleaned = steps?.filter((s) => s.length > 0);
    return cleaned && cleaned.length > 0 ? cleaned : undefined;
  }),
  /** Extra tip for the user */
  tip: z.string().trim().optional().transform((v) => (v && v.length > 0 ? v : undefined)),
});

type ParsedClassifyResult = z.infer<typeof ClassifyResultSchema>;

export type ClassifyResult = Omit<ParsedClassifyResult, 'preparation' | 'tip'> & {
  preparation?: string[];
  tip?: string;
};

/** Public v1 request contract for classification. */
export const ClassifyRequestSchema = z.object({
  image: z.string().max(MAX_CLASSIFY_IMAGE_BASE64_LENGTH).optional(),
  text: z.string().trim().min(1).max(MAX_CLASSIFY_TEXT_LENGTH).optional(),
  locale: LocaleSchema.default('en'),
}).refine((value) => Boolean(value.image || value.text), {
  message: 'Either image or text is required',
});

export type ClassifyRequest = z.input<typeof ClassifyRequestSchema>;

/** Provider interface for classification */
export interface ClassifyProvider {
  name: string;
  classify(request: ClassifyRequest): Promise<ClassifyResult>;
}

/** Provider type identifier */
export type ProviderType = 'groq' | 'pollinations';
