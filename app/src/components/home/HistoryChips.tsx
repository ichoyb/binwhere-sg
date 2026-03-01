'use client';

import type { ScanHistoryItem } from '@/types/app';
import { STATUS_CONFIG } from '@/lib/constants';

interface HistoryChipsProps {
  items: ScanHistoryItem[];
  onSelect?: (item: ScanHistoryItem) => void;
  onClear?: () => void;
}

export default function HistoryChips({ items, onSelect, onClear }: HistoryChipsProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-caption font-medium text-gray-400 uppercase tracking-wide">Recent</h3>
        {onClear && (
          <button
            onClick={onClear}
            className="p-1 text-gray-300 active:text-gray-500"
            aria-label="Clear history"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6h12M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {items.map((item) => {
          const config = STATUS_CONFIG[item.status];
          const clickable = !!item.result && !!onSelect;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect(item)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium whitespace-nowrap shrink-0 border transition-opacity
                ${clickable ? 'active:opacity-70 cursor-pointer' : 'cursor-default'}`}
              style={{
                backgroundColor: config.bgColor,
                borderColor: config.borderColor,
                color: config.textColor,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {item.item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
