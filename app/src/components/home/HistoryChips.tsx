'use client';

import type { ScanHistoryItem } from '@/types/app';
import { STATUS_CONFIG } from '@/lib/constants';

interface HistoryChipsProps {
  items: ScanHistoryItem[];
}

export default function HistoryChips({ items }: HistoryChipsProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Recent</h3>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {items.map((item) => {
          const config = STATUS_CONFIG[item.status];
          return (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 border"
              style={{
                backgroundColor: config.bgColor,
                borderColor: config.borderColor,
                color: config.color,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {item.item}
            </span>
          );
        })}
      </div>
    </div>
  );
}
