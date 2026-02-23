'use client';

import type { ClassifyResult } from '@/lib/ai/types';
import { CHANNEL_LABELS } from '@/types/recycling';
import { CHANNEL_TO_NEARBY } from '@/lib/constants';
import BackButton from '@/components/shared/BackButton';
import PointCard from '@/components/nearby/PointCard';
import { useNearby } from '@/hooks/useNearby';

interface NearbyListPageProps {
  result: ClassifyResult;
  userLocation: { lat: number; lng: number } | null;
  onBack: () => void;
}

export default function NearbyListPage({ result, userLocation, onBack }: NearbyListPageProps) {
  const nearbyChannel = result.channel ? CHANNEL_TO_NEARBY[result.channel] : null;
  const { points, loading, error } = useNearby(userLocation, nearbyChannel);

  const channelLabel = result.channel ? CHANNEL_LABELS[result.channel] : 'Recycling';

  return (
    <div className="min-h-full bg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-2">
          <BackButton onClick={onBack} />
          <h1 className="text-base font-semibold text-gray-900 truncate">{channelLabel} Nearby</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {loading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-card p-4 border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </>
        )}

        {error && (
          <p className="text-center text-sm text-red-500 py-4">{error}</p>
        )}

        {!loading && !error && points.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No points found nearby</p>
        )}

        {points.map((point, i) => (
          <PointCard key={i} point={point} />
        ))}
      </div>
    </div>
  );
}
