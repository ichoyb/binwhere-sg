import { z } from 'zod';

/** Zod schema for AI classification result */
export const ClassifyResultSchema = z.object({
  /** Identified item name */
  item: z.string(),
  /** Recycling status */
  status: z.enum([
    'recyclable',
    'special_handling',
    'consider_donating',
    'not_recyclable',
    'not_sure',
  ]),
  /** Confidence score 0-1 */
  confidence: z.number().min(0).max(1),
  /** Which recycling channel to use */
  channel: z.enum([
    'blue_bin',
    'ewaste',
    'ewaste_battery',
    'lighting',
    'textile',
    'hazardous',
    'bulky_waste',
    'donation',
    'general_waste',
  ]).nullable(),
  /** Why this classification was made */
  reason: z.string(),
  /** How to prepare the item for recycling (step-by-step) */
  preparation: z.array(z.string()).optional(),
  /** Extra tip for the user */
  tip: z.string().optional(),
});

export type ClassifyResult = z.infer<typeof ClassifyResultSchema>;

/** Input for classification */
export interface ClassifyRequest {
  /** Base64-encoded image */
  image?: string;
  /** Text description of the item */
  text?: string;
  /** User locale */
  locale?: 'en' | 'zh' | 'ms' | 'ta';
}

/** Provider interface for classification */
export interface ClassifyProvider {
  name: string;
  classify(request: ClassifyRequest): Promise<ClassifyResult>;
}

/** Provider type identifier */
export type ProviderType = 'groq' | 'pollinations';
