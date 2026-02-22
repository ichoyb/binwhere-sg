'use client';

import type { NearbyPoint } from '@/types/app';
import NavigateButton from '@/components/shared/NavigateButton';
import { formatDistance, estimateWalkTime } from '@/lib/format';

interface NearestPointProps {
  point: NearbyPoint;
}

export default function NearestPoint({ point }: NearestPointProps) {
  return (
    <div className="bg-white rounded-card p-4 border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Nearest Point</h3>
          <p className="text-sm text-gray-900 font-medium truncate">{point.name}</p>
          {point.address && (
            <p className="text-xs text-gray-400 truncate">{point.address}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {formatDistance(point.distanceKm)} · ~{estimateWalkTime(point.distanceKm)} min walk
          </p>
        </div>
        <NavigateButton lat={point.lat} lng={point.lng} name={point.name} />
      </div>
    </div>
  );
}
