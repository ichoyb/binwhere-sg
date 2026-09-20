'use client';

import { useState } from 'react';
import { getDestinationChannel } from '@binwhere/core';
import dynamic from 'next/dynamic';
import type { ClassifyResult } from '@/lib/ai/types';
import type { Locale } from '@/lib/i18n/types';
import { t, type TranslationKey } from '@/lib/i18n';
import { CHANNEL_TO_NEARBY, getFriendlyApiError } from '@/lib/constants';
import BackButton from '@/components/shared/BackButton';
import RecyclingPointCard from '@/components/shared/RecyclingPointCard';
import ViewToggle from '@/components/nearby/ViewToggle';
import { useNearby } from '@/hooks/useNearby';

const NearbyMapView = dynamic(() => import('./NearbyMapView'), { ssr: false });

interface NearbyListPageProps {
  result: ClassifyResult;
  userLocation: { lat: number; lng: number } | null;
  onBack: () => void;
  locale: Locale;
}

export default function NearbyListPage({ result, userLocation, onBack, locale }: NearbyListPageProps) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const destination = getDestinationChannel(result);
  const nearbyChannel = destination ? CHANNEL_TO_NEARBY[destination] : null;
  const { points, loading, error } = useNearby(userLocation, nearbyChannel);

  const channelLabel = destination ? t(locale, `channel.${destination}` as TranslationKey) : '';

  return (
    <div className="min-h-full bg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-2">
          <BackButton onClick={onBack} label={t(locale, 'result.back')} />
          <h1 className="text-base font-semibold text-gray-900 truncate flex-1">{channelLabel} {t(locale, 'nearby.nearby')}</h1>
          <ViewToggle mode={viewMode} onChange={setViewMode} locale={locale} />
        </div>
      </div>

      {result.next_action && <p className="px-4 pt-4 text-body text-gray-600">{result.next_action.qualification}</p>}
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
            <p className="text-center text-sm text-red-500 py-4">
              {getFriendlyApiError(error, locale)}
            </p>
          )}

          {!loading && !error && points.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">{t(locale, 'nearby.noPoints')}</p>
          )}

          {points.map((point, i) => (
            <RecyclingPointCard key={`${point.name}-${i}`} point={point} locale={locale} />
          ))}
        </div>
      ) : (
        <>
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-gray-400">{t(locale, 'nearby.loadingMap')}</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-red-500">{getFriendlyApiError(error, locale)}</p>
            </div>
          )}

          {!loading && !error && points.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-gray-400">{t(locale, 'nearby.noPoints')}</p>
            </div>
          )}

          {!loading && !error && points.length > 0 && (
            <div style={{ height: 'calc(100dvh - 52px)' }}>
              <NearbyMapView
                points={points}
                userLocation={userLocation}
                channel={destination}
                locale={locale}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
