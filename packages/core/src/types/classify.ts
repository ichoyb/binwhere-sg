import { z } from 'zod';
import { LocaleSchema } from '../i18n/types';
import {
  ChannelTypeSchema,
  ClassifyStatusSchema,
  type ChannelType,
  type ClassifyStatus,
} from './recycling';

export const MAX_CLASSIFY_IMAGE_BASE64_LENGTH = 7_000_000;
export const MAX_CLASSIFY_TEXT_LENGTH = 500;

export const CHANNEL_STATUS: Record<ChannelType, Exclude<ClassifyStatus, 'not_sure'>> = {
  blue_bin: 'recyclable',
  return_point: 'recyclable',
  ewaste: 'special_handling',
  ewaste_battery: 'special_handling',
  lighting: 'special_handling',
  textile: 'recyclable',
  hazardous: 'special_handling',
  bulky_waste: 'special_handling',
  donation: 'consider_donating',
  general_waste: 'not_recyclable',
};

/** Wire shape retained so a historical production profile can be replayed exactly. */
export const ClassifyResultShapeSchema = z.object({
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

/** Runtime schema for an internally consistent AI classification result. */
export const ClassifyResultSchema = ClassifyResultShapeSchema.superRefine((result, ctx) => {
  if (result.channel === null) {
    if (result.status !== 'not_sure') {
      ctx.addIssue({
        code: 'custom',
        path: ['channel'],
        message: 'channel may be null only when status is not_sure',
      });
    }
    return;
  }

  const expectedStatus = CHANNEL_STATUS[result.channel];
  if (result.status !== expectedStatus) {
    ctx.addIssue({
      code: 'custom',
      path: ['status'],
      message: `channel ${result.channel} requires status ${expectedStatus}`,
    });
  }
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

// The classify *provider* interface deliberately does not live here. Core is the
// contract both clients share, compiled against lib ES2020 with no platform
// globals so a browser-only or Node-only API cannot leak into the React Native
// bundle. A provider is server-side machinery that only the web app implements,
// and typing its cancellation needs AbortSignal — so it belongs in app/src/lib/ai.
