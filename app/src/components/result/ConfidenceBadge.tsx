'use client';

import { LOW_CONFIDENCE_THRESHOLD } from '@/lib/constants';

interface ConfidenceBadgeProps {
  confidence: number;
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (confidence >= LOW_CONFIDENCE_THRESHOLD) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <span className="text-caption text-amber-700">
        We&apos;re not 100% sure — double check before recycling
      </span>
    </div>
  );
}
