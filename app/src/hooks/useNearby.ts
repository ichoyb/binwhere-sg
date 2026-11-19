'use client';

import { useState, useEffect, useRef } from 'react';
import type { NearbyPoint, NearbyChannel } from '@/types/app';
import type { ApiErrorCode, ItemKind } from '@binwhere/core';
import { ApiError, fetchNearby } from '@/lib/api-client';

/** Cache key for deduplication */
function cacheKey(lat: number, lng: number, channel: string, acceptedItem?: string, itemKind?: ItemKind): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)},${channel}${acceptedItem ? `,accepted:${acceptedItem}` : ''}${itemKind ? `,kind:${itemKind}` : ''}`;
}

/** Module-level cache to deduplicate across component instances */
const nearbyCache = new Map<string, { points: NearbyPoint[]; timestamp: number }>();
const CACHE_TTL = 60_000; // 1 minute

/**
 * Fetch nearby recycling points.
 * Deduplicates requests with same location+channel within 1 minute.
 */
export function useNearby(
  userLocation: { lat: number; lng: number } | null,
  channel: NearbyChannel | null,
  acceptedItem?: string,
  itemKind?: ItemKind,
) {
  const [points, setPoints] = useState<NearbyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userLocation || !channel) {
      setPoints([]);
      return;
    }

    const key = cacheKey(userLocation.lat, userLocation.lng, channel, acceptedItem, itemKind);

    // Check cache first
    const cached = nearbyCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setPoints(cached.points);
      setLoading(false);
      return;
    }

    // Skip if same request already in-flight
    if (lastKeyRef.current === key && loading) return;
    lastKeyRef.current = key;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchNearby({
      lat: userLocation.lat,
      lng: userLocation.lng,
      channel,
      limit: 20,
      ...(acceptedItem && { acceptedItem }),
      ...(itemKind && { itemKind }),
    })
      .then((data) => {
        if (!cancelled) {
          setPoints(data.results);
          setLoading(false);
          nearbyCache.set(key, { points: data.results, timestamp: Date.now() });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.code : 'UNKNOWN');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation?.lat, userLocation?.lng, channel, acceptedItem, itemKind]);

  return { points, loading, error };
}
