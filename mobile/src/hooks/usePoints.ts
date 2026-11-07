import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointsResponse } from '@binwhere/core';
import { buildPointsUrl, fetchPoints } from '../api/client';
import { readPointsCache, writePointsCache, type PointsCache } from '../lib/points-cache';
import { reportError } from '../lib/reporting';

export function usePoints() {
  const cache = useRef<PointsCache | null>(null);
  const [response, setResponse] = useState<PointsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const apiUrl = buildPointsUrl();
      const update = await fetchPoints(apiUrl, cache.current?.etag ?? null);
      if (update.status === 200) {
        const next = { apiUrl, etag: update.etag, response: update.response };
        cache.current = next;
        setResponse(update.response);
        await writePointsCache(AsyncStorage, next).catch((error) => reportError(error, { operation: 'points-cache-write' }));
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      cache.current = await readPointsCache(AsyncStorage, buildPointsUrl())
        .catch((error) => {
          reportError(error, { operation: 'points-cache-read' });
          return null;
        });
      if (cache.current) setResponse(cache.current.response);
      await refresh();
    })();
  }, [refresh]);

  return { response, failed: failed && response === null, loading, refresh };
}
