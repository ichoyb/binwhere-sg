'use client';

import { useState, useCallback, useEffect } from 'react';
import { ScanHistorySchema, type ScanHistoryItem } from '@/types/app';
import type { ClassifyResult } from '@/lib/ai/types';
import type { Locale } from '@/lib/i18n/types';
import { getItem, setItem } from '@/lib/storage';
import { MAX_HISTORY_ITEMS } from '@/lib/constants';

const STORAGE_KEY = 'binwhere_history';

export function useHistory() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  // Load on mount
  useEffect(() => {
    const stored = getItem<unknown>(STORAGE_KEY);
    const parsed = ScanHistorySchema.safeParse(stored);
    if (parsed.success) {
      setHistory(parsed.data.slice(0, MAX_HISTORY_ITEMS));
    }
  }, []);

  const addToHistory = useCallback((result: ClassifyResult, locale?: Locale) => {
    setHistory((prev) => {
      const item: ScanHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item: result.item,
        status: result.status,
        channel: result.channel,
        timestamp: Date.now(),
        result,
        locale,
      };
      const next = [item, ...prev].slice(0, MAX_HISTORY_ITEMS);
      setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setItem(STORAGE_KEY, []);
  }, []);

  return { history, addToHistory, clearHistory };
}
