'use client';

import type { NearbyPoint } from '@/types/app';
import NavigateButton from '@/components/shared/NavigateButton';
import { formatDistance, estimateWalkTime } from '@/lib/format';

interface RecyclingPointCardProps {
  point: NearbyPoint;
  heading?: string;
}

export default function RecyclingPointCard({ point, heading }: RecyclingPointCardProps) {
  return (
    <div className="bg-white rounded-card p-4 border border-gray-100">
      {heading && (
        <h3 className="text-caption font-semibold text-gray-700 mb-1.5">{heading}</h3>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium text-gray-900 line-clamp-2">{point.name}</p>
          {point.address && (
            <p className="text-caption text-gray-400 line-clamp-1 mt-0.5">{point.address}</p>
          )}
          {point.accepts && (
            <p className="text-caption text-gray-400 mt-0.5">Accepts: {point.accepts}</p>
          )}
          <p className="text-caption text-gray-500 mt-1">
            {formatDistance(point.distanceKm)} · ~{estimateWalkTime(point.distanceKm)} min walk
          </p>
        </div>
        <NavigateButton lat={point.lat} lng={point.lng} name={point.name} label="Go" />
      </div>
    </div>
  );
}
