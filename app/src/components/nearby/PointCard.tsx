'use client';

import type { NearbyPoint } from '@/types/app';
import NavigateButton from '@/components/shared/NavigateButton';
import { formatDistance, estimateWalkTime } from '@/lib/format';

interface PointCardProps {
  point: NearbyPoint;
}

export default function PointCard({ point }: PointCardProps) {
  return (
    <div className="bg-white rounded-card p-4 border border-gray-100 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{point.name}</p>
        {point.address && (
          <p className="text-xs text-gray-400 truncate">{point.address}</p>
        )}
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDistance(point.distanceKm)} · ~{estimateWalkTime(point.distanceKm)} min walk
        </p>
      </div>
      <NavigateButton lat={point.lat} lng={point.lng} label="Go" />
    </div>
  );
}
