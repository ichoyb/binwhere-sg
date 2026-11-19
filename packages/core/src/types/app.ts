import { z } from 'zod';
import { ItemKindSchema, isEwasteItemKind, type ItemKind } from '../item-kind';
import { isDonationItemKind } from '../donation-mapping';
import type { ClassifyResult } from './classify';
import type { Locale } from '../i18n/types';
import { ClassifyResultSchema } from './classify';
import { ChannelTypeSchema, ClassifyStatusSchema } from './recycling';
import { LocaleSchema } from '../i18n/types';

export type AppView = 'home' | 'result' | 'nearby';

export interface ScanHistoryItem {
  id: string;
  item: string;
  status: ClassifyResult['status'];
  channel: ClassifyResult['channel'];
  timestamp: number;
  /** Full classification result for re-display when tapped */
  result?: ClassifyResult;
  /** Locale when this item was classified */
  locale?: Locale;
}

export const ScanHistoryItemSchema: z.ZodType<ScanHistoryItem> = z.object({
  id: z.string().min(1),
  item: z.string().min(1),
  status: ClassifyStatusSchema,
  channel: ChannelTypeSchema.nullable(),
  timestamp: z.number().finite().nonnegative(),
  result: ClassifyResultSchema.optional(),
  locale: LocaleSchema.optional(),
});

export const ScanHistorySchema = z.array(ScanHistoryItemSchema);

export const SINGAPORE_BOUNDS = {
  minLat: 1.15,
  maxLat: 1.47,
  minLng: 103.6,
  maxLng: 104.05,
} as const;

export function isSingaporeCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= SINGAPORE_BOUNDS.minLat
    && lat <= SINGAPORE_BOUNDS.maxLat
    && lng >= SINGAPORE_BOUNDS.minLng
    && lng <= SINGAPORE_BOUNDS.maxLng;
}

/** Channels supported by the nearby API. */
export const NearbyChannelSchema = z.enum([
  'blue_bin',
  'return_point',
  'ewaste',
  'ewaste_battery',
  'lighting',
  'textile',
  'donation',
]);

export type NearbyChannel = z.infer<typeof NearbyChannelSchema>;

export const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(SINGAPORE_BOUNDS.minLat).max(SINGAPORE_BOUNDS.maxLat),
  lng: z.coerce.number().min(SINGAPORE_BOUNDS.minLng).max(SINGAPORE_BOUNDS.maxLng),
  channel: NearbyChannelSchema,
  limit: z.coerce.number().int().min(1).max(20).default(5),
  radius: z.coerce.number().min(0.1).max(5).default(1),
  acceptedItem: z.string().trim().min(1).max(100).optional(),
  itemKind: ItemKindSchema.optional(),
}).superRefine((input, ctx) => {
  if (input.itemKind === undefined) return;
  if (input.acceptedItem !== undefined || !(
    (input.channel === 'ewaste' && isEwasteItemKind(input.itemKind))
    || (input.channel === 'donation' && isDonationItemKind(input.itemKind))
  )) {
    ctx.addIssue({ code: 'custom', path: ['itemKind'], message: 'itemKind must match the channel and cannot accompany acceptedItem' });
  }
});

export type NearbyQuery = z.infer<typeof NearbyQuerySchema>;
export interface NearbyQueryInput {
  lat: number;
  lng: number;
  channel: NearbyChannel;
  limit?: number;
  radius?: number;
  acceptedItem?: string;
  itemKind?: ItemKind;
}

export const NearbyPointSchema = z.object({
  name: z.string(),
  address: z.string(),
  postalCode: z.string(),
  distanceKm: z.number().nonnegative(),
  lat: z.number(),
  lng: z.number(),
  /** What this point accepts, e.g. "ICT, Batteries, Lamps" or "Clothing". */
  accepts: z.string().optional(),
  /** Reuse type for donation points: Donate, Resell, or Repair. */
  reuseType: z.string().optional(),
  /** Display-friendly opening hours summary for BCRS return points. */
  openingHours: z.string().optional(),
  /** Machine status for BCRS return points. */
  machineStatus: z.string().optional(),
});

export type NearbyPoint = z.infer<typeof NearbyPointSchema>;

export const NearbyResponseSchema = z.object({
  channel: NearbyChannelSchema,
  center: z.object({ lat: z.number(), lng: z.number() }),
  radiusKm: z.number().positive(),
  count: z.number().int().nonnegative(),
  results: z.array(NearbyPointSchema),
});

export type NearbyResponse = z.infer<typeof NearbyResponseSchema>;
