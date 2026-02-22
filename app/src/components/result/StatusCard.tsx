'use client';

import type { ClassifyResult } from '@/lib/ai/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { CHANNEL_LABELS } from '@/types/recycling';
import StatusIcon from '@/components/shared/StatusIcon';

interface StatusCardProps {
  result: ClassifyResult;
}

export default function StatusCard({ result }: StatusCardProps) {
  const config = STATUS_CONFIG[result.status];

  return (
    <div
      className="rounded-card p-4 border"
      style={{ backgroundColor: config.bgColor, borderColor: config.borderColor }}
    >
      <div className="flex items-start gap-3">
        <StatusIcon status={result.status} size={48} />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{result.item}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: config.color }}
            >
              {config.label}
            </span>
            {result.channel && (
              <span className="text-xs text-gray-500">
                {CHANNEL_LABELS[result.channel]}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{result.reason}</p>
        </div>
      </div>
    </div>
  );
}
