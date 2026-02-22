'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ScanHistoryItem } from '@/types/app';
import type { ClassifyResult } from '@/lib/ai/types';
import { getItem, setItem } from '@/lib/storage';
import { MAX_HISTORY_ITEMS } from '@/lib/constants';

const STORAGE_KEY = 'binwhere_history';

export function useHistory() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  // Load on mount
  useEffect(() => {
    const stored = getItem<ScanHistoryItem[]>(STORAGE_KEY);
    if (stored && Array.isArray(stored)) {
      setHistory(stored);
    }
  }, []);

  const addToHistory = useCallback((result: ClassifyResult) => {
    setHistory((prev) => {
      const item: ScanHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item: result.item,
        status: result.status,
        channel: result.channel,
        timestamp: Date.now(),
      };
      const next = [item, ...prev].slice(0, MAX_HISTORY_ITEMS);
      setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { history, addToHistory };
}
