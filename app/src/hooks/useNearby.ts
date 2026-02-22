'use client';

import { useState, useEffect } from 'react';
import type { NearbyPoint } from '@/types/app';
import { fetchNearby } from '@/lib/api-client';

/**
 * Fetch nearby recycling points.
 * Handles channel mapping: ewaste_battery and lighting → ewaste.
 */
export function useNearby(
  userLocation: { lat: number; lng: number } | null,
  channel: 'blue_bin' | 'ewaste' | null,
) {
  const [points, setPoints] = useState<NearbyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLocation || !channel) {
      setPoints([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchNearby({
      lat: userLocation.lat,
      lng: userLocation.lng,
      channel,
      limit: 5,
    })
      .then((data) => {
        if (!cancelled) {
          setPoints(data.results);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation, channel]);

  return { points, loading, error };
}
