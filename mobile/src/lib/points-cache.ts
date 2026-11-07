import { PointsResponseSchema, type PointsResponse } from '@binwhere/core';

export const pointsCacheKey = 'binwhere.points.v2';

export interface PointsCache {
  apiUrl: string;
  etag: string | null;
  response: PointsResponse;
}

export interface PointsStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export async function readPointsCache(storage: PointsStorage, apiUrl: string): Promise<PointsCache | null> {
  const raw = await storage.getItem(pointsCacheKey);
  if (raw === null) return null;
  let cached: unknown;
  try {
    cached = JSON.parse(raw);
  } catch {
    await storage.removeItem(pointsCacheKey);
    return null;
  }
  if (typeof cached !== 'object' || cached === null || !('apiUrl' in cached) || typeof cached.apiUrl !== 'string'
      || !('etag' in cached) || !(cached.etag === null || typeof cached.etag === 'string')
      || !('response' in cached)) {
    await storage.removeItem(pointsCacheKey);
    return null;
  }
  const parsed = PointsResponseSchema.safeParse(cached.response);
  if (!parsed.success) {
    await storage.removeItem(pointsCacheKey);
    return null;
  }
  if (cached.apiUrl !== apiUrl) return null;
  return { apiUrl, etag: cached.etag, response: parsed.data };
}

export async function writePointsCache(storage: PointsStorage, cache: PointsCache): Promise<void> {
  await storage.setItem(pointsCacheKey, JSON.stringify(cache));
}
