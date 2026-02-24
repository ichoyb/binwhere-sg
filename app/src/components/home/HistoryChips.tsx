'use client';

import type { ScanHistoryItem } from '@/types/app';
import { STATUS_CONFIG } from '@/lib/constants';

interface HistoryChipsProps {
  items: ScanHistoryItem[];
  onSelect?: (item: ScanHistoryItem) => void;
}

export default function HistoryChips({ items, onSelect }: HistoryChipsProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-caption font-medium text-gray-400 uppercase tracking-wide mb-2">Recent</h3>
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
