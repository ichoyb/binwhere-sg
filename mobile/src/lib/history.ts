import type { ClassifyResult, Locale, ScanHistoryItem } from '@binwhere/core';
import { MAX_HISTORY_ITEMS, ScanHistorySchema } from '@binwhere/core';

export const HISTORY_STORAGE_KEY = 'binwhere_history';

/** Create a history entry — same shape stored by useHistory. */
export function createHistoryItem(
  result: ClassifyResult,
  locale?: Locale,
  now: number = Date.now(),
): ScanHistoryItem {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 6)}`,
    item: result.item,
    status: result.status,
    channel: result.channel,
    timestamp: now,
    result,
    locale,
  };
}

/** Prepend and cap history list. */
export function appendHistory(
  prev: ScanHistoryItem[],
  item: ScanHistoryItem,
  max: number = MAX_HISTORY_ITEMS,
): ScanHistoryItem[] {
  return [item, ...prev].slice(0, max);
}

/** Serialize history for AsyncStorage. */
export function encodeHistory(items: ScanHistoryItem[]): string {
  return JSON.stringify(items);
}

/** Parse history JSON; returns null on invalid payload. */
export function decodeHistory(raw: string | null): ScanHistoryItem[] | null {
  if (raw == null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const history = ScanHistorySchema.safeParse(parsed);
    return history.success
      ? history.data.slice(0, MAX_HISTORY_ITEMS)
      : null;
  } catch {
    return null;
  }
}
