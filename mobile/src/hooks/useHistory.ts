import { useCallback, useEffect, useState } from 'react';
import type { ClassifyResult, Locale, ScanHistoryItem } from '@binwhere/core';
import { MAX_HISTORY_ITEMS, ScanHistorySchema } from '@binwhere/core';
import { getItem, setItem } from '../lib/storage';
import {
  HISTORY_STORAGE_KEY,
  appendHistory,
  createHistoryItem,
  decodeHistory,
  encodeHistory,
} from '../lib/history';

export function useHistory() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getItem<string | ScanHistoryItem[]>(HISTORY_STORAGE_KEY);
        if (cancelled) return;
        let next: ScanHistoryItem[] | null = null;
        if (typeof raw === 'string') {
          next = decodeHistory(raw);
        } else {
          const parsed = ScanHistorySchema.safeParse(raw);
          next = parsed.success
            ? parsed.data.slice(0, MAX_HISTORY_ITEMS)
            : null;
        }
        if (next) setHistory(next);
      } catch {
        // Keep an empty in-memory history when local storage is unavailable.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addToHistory = useCallback((result: ClassifyResult, locale?: Locale) => {
    setHistory((prev) => {
      const item = createHistoryItem(result, locale);
      const next = appendHistory(prev, item);
      void setItem(HISTORY_STORAGE_KEY, next).catch(() => undefined);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    void setItem(HISTORY_STORAGE_KEY, []).catch(() => undefined);
  }, []);

  return { history, addToHistory, clearHistory, ready, encodeHistory, decodeHistory };
}
