import type { ClassifyResult } from '@/lib/ai/types';
import type { NearbyResponse } from '@/types/app';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function classifyItem(params: {
  image?: string;
  text?: string;
}): Promise<ClassifyResult> {
  const res = await fetch('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new ApiError(res.status, `Classification failed (${res.status})`);
  }

  return res.json();
}

export async function fetchNearby(params: {
  lat: number;
  lng: number;
  channel: 'blue_bin' | 'ewaste';
  limit?: number;
  radius?: number;
}): Promise<NearbyResponse> {
  const qs = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    channel: params.channel,
    ...(params.limit && { limit: String(params.limit) }),
    ...(params.radius && { radius: String(params.radius) }),
  });

  const res = await fetch(`/api/nearby?${qs}`);

  if (!res.ok) {
    throw new ApiError(res.status, `Nearby query failed (${res.status})`);
  }

  return res.json();
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500;
  }
  // Network errors (fetch throws TypeError)
  return error instanceof TypeError;
}
