'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ClassifyResult } from '@/lib/ai/types';
import { CHANNEL_LABELS } from '@/types/recycling';
import { CHANNEL_TO_NEARBY } from '@/lib/constants';
import BackButton from '@/components/shared/BackButton';
import RecyclingPointCard from '@/components/shared/RecyclingPointCard';
import ViewToggle from '@/components/nearby/ViewToggle';
import { useNearby } from '@/hooks/useNearby';

const NearbyMapView = dynamic(() => import('./NearbyMapView'), { ssr: false });

interface NearbyListPageProps {
  result: ClassifyResult;
  userLocation: { lat: number; lng: number } | null;
  onBack: () => void;
}

export default function NearbyListPage({ result, userLocation, onBack }: NearbyListPageProps) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const nearbyChannel = result.channel ? CHANNEL_TO_NEARBY[result.channel] : null;
  const { points, loading, error } = useNearby(userLocation, nearbyChannel);

  const channelLabel = result.channel ? CHANNEL_LABELS[result.channel] : 'Recycling';

  return (
    <div className="min-h-full bg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-2">
          <BackButton onClick={onBack} />
          <h1 className="text-base font-semibold text-gray-900 truncate flex-1">{channelLabel} Nearby</h1>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {viewMode === 'list' ? (
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
            <RecyclingPointCard key={`${point.name}-${i}`} point={point} />
          ))}
        </div>
      ) : (
        <>
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-gray-400">Loading map...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && points.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-gray-400">No points found nearby</p>
            </div>
          )}

          {!loading && !error && points.length > 0 && (
            <div style={{ height: 'calc(100dvh - 52px)' }}>
              <NearbyMapView
                points={points}
                userLocation={userLocation}
                channel={result.channel ?? null}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
