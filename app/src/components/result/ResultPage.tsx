'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ClassifyResult } from '@/lib/ai/types';
import type { Locale } from '@/lib/i18n/types';
import { t, type TranslationKey } from '@/lib/i18n';
import { STATUS_CONFIG } from '@/lib/constants';
import ConfidenceBadge from '@/components/result/ConfidenceBadge';
import RecyclingPointCard from '@/components/shared/RecyclingPointCard';
import StatusIcon from '@/components/shared/StatusIcon';
import ViewToggle from '@/components/nearby/ViewToggle';
import { useNearby } from '@/hooks/useNearby';
import { CHANNEL_TO_NEARBY, CHANNEL_DISPLAY_CONFIG } from '@/lib/constants';
import { mapItemToAcceptedItem } from '@/lib/donation-mapping';
import HazardousInfoCard from '@/components/result/HazardousInfoCard';

const NearbyMapView = dynamic(() => import('@/components/nearby/NearbyMapView'), { ssr: false });

interface ResultPageProps {
  result: ClassifyResult;
  capturedImage: string | null;
  userLocation: { lat: number; lng: number } | null;
  geoLoading?: boolean;
  onScanAgain: () => void;
  onViewNearby?: () => void;
  onRequestLocation?: () => void;
  locale: Locale;
}

async function handleShare(result: ClassifyResult, locale: Locale) {
  const statusLabel = t(locale, `status.${result.status}` as TranslationKey);
  const text = `${result.item} — ${statusLabel}. ${result.reason}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'BinWhere Result', text });
    } catch {
      // User cancelled or share failed
    }
  } else {
    await navigator.clipboard.writeText(text);
  }
}

export default function ResultPage({
  result,
  capturedImage,
  userLocation,
  geoLoading,
  onScanAgain,
  onRequestLocation,
  locale,
}: ResultPageProps) {
  const nearbyChannel = result.channel ? CHANNEL_TO_NEARBY[result.channel] : null;
  const isHazardous = result.channel === 'hazardous';
  const isInSingapore = userLocation
    ? userLocation.lat >= 1.15 && userLocation.lat <= 1.47 && userLocation.lng >= 103.6 && userLocation.lng <= 104.05
    : false;

  // For donation channel, derive acceptedItem from the item name
  const acceptedItem = nearbyChannel === 'donation' ? mapItemToAcceptedItem(result.item) : undefined;

  // For bulky_waste, also query donation channel for Furniture/Large home appliances
  const bulkyDonationChannel = result.channel === 'bulky_waste' ? 'donation' as const : null;
  const bulkyAcceptedItem = result.channel === 'bulky_waste' ? 'Furniture' : undefined;

  const { points, loading: nearbyLoading } = useNearby(
    isInSingapore ? userLocation : null,
    nearbyChannel,
    acceptedItem,
  );

  const { points: donationPoints, loading: donationLoading } = useNearby(
    isInSingapore ? userLocation : null,
    bulkyDonationChannel,
    bulkyAcceptedItem,
  );

  const [nearbyMode, setNearbyMode] = useState<'list' | 'map'>('map');
  const [donationMode, setDonationMode] = useState<'list' | 'map'>('map');
  const statusCfg = STATUS_CONFIG[result.status];
  const channelCfg = result.channel ? CHANNEL_DISPLAY_CONFIG[result.channel] : null;
  // Use channel color when available so header matches map markers
  const config = channelCfg
    ? { ...statusCfg, color: channelCfg.color, bgColor: channelCfg.bgColor, textColor: channelCfg.textColor, borderColor: channelCfg.borderColor }
    : statusCfg;

  const nearbyHeadingKeyMap: Record<string, TranslationKey> = {
    blue_bin: 'result.nearbyBlueBins',
    textile: 'result.nearbyTextileBins',
    donation: 'result.nearbyDonationPoints',
  };
  const nearbyHeading = nearbyChannel ? t(locale, nearbyHeadingKeyMap[nearbyChannel] ?? 'result.nearbyEwastePoints') : '';

  return (
    <div className="min-h-full bg-bg">
      {/* Status Color Block Header */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: config.bgColor }}
      >
        {/* Background image if available */}
        {capturedImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${capturedImage}`}
              alt="Scanned item"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: config.bgColor, opacity: 0.7 }}
            />
          </>
        )}

        {/* Top bar: Back + Share */}
        <div
          className="relative flex items-center justify-between px-4"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          <button
            onClick={onScanAgain}
            className="flex items-center gap-1 py-2 -ml-1 active:opacity-70"
            style={{ color: config.textColor }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span className="text-body font-medium">{t(locale, 'result.back')}</span>
          </button>
          <button
            onClick={() => handleShare(result, locale)}
            className="p-2 -mr-1 active:opacity-70"
            style={{ color: config.textColor }}
            aria-label="Share result"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
        </div>

        {/* Status content */}
        <div className="relative px-4 pt-3 pb-4 flex flex-col items-center text-center">
          <StatusIcon status={result.status} size={44} />
          <span
            className="inline-block mt-2 px-3 py-0.5 rounded-full text-caption font-semibold text-center"
            style={{ backgroundColor: `${config.color}20`, color: config.textColor, maxWidth: '90%' }}
          >
            {t(locale, `status.${result.status}` as TranslationKey)}
          </span>
          <h2 className="text-lg font-bold mt-1.5 line-clamp-2" style={{ color: config.textColor }}>
            {result.item}
          </h2>
          {result.channel && (
            <span className="text-caption mt-1" style={{ color: config.textColor, opacity: 0.7 }}>
              {t(locale, `channel.${result.channel}` as TranslationKey)}
            </span>
          )}
        </div>
      </div>

      {/* Content cards */}
      <div className="px-4 pb-6 space-y-2.5 mt-2">
        {/* Combined: Reason + Disposal + Preparation */}
        <div className="bg-white rounded-card p-4 border border-gray-100 space-y-3">
          <p className="text-body text-gray-600 leading-relaxed">{result.reason}</p>

          {/* Disposal instruction tag */}
          {result.channel && (() => {
            const ch = CHANNEL_DISPLAY_CONFIG[result.channel];
            return (
              <div
                className="flex items-start gap-2 px-3 py-1.5 rounded-btn"
                style={{ backgroundColor: `${ch.color}12`, color: ch.textColor }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ch.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <path d={ch.iconPath} />
                </svg>
                <span className="text-caption font-semibold">{t(locale, `instruction.${result.channel}` as TranslationKey)}</span>
              </div>
            );
          })()}

          {/* Preparation steps */}
          {result.preparation && result.preparation.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-caption font-semibold text-gray-700 mb-2">{t(locale, 'result.beforeYouGo')}</h4>
              <ul className="space-y-1.5">
                {result.preparation.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-nea-green/10 text-nea-green text-caption font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-body text-gray-600">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Low confidence warning */}
        <ConfidenceBadge confidence={result.confidence} locale={locale} />

        {/* Tip */}
        {result.tip && (
          <div className="bg-white rounded-card p-4 border border-gray-100">
            <p className="text-body text-gray-600">
              <span className="font-medium text-gray-700">{t(locale, 'result.tip')}</span>
              {result.tip}
            </p>
          </div>
        )}

        {/* Hazardous waste info card */}
        {isHazardous && <HazardousInfoCard locale={locale} />}

        {/* Nearby points section */}
        {nearbyLoading && (
          <div className="bg-white rounded-card p-4 border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        )}
        {points.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-caption font-semibold text-gray-700 min-w-0">{t(locale, 'result.nearby')} {nearbyHeading}</h3>
              <ViewToggle mode={nearbyMode} onChange={setNearbyMode} locale={locale} />
            </div>
            {nearbyMode === 'list' ? (
              <div className="space-y-2">
                {points.map((point, i) => (
                  <RecyclingPointCard key={`${point.name}-${i}`} point={point} locale={locale} />
                ))}
              </div>
            ) : (
              <div className="rounded-card overflow-hidden border border-gray-100" style={{ height: '350px' }}>
                <NearbyMapView
                  points={points}
                  userLocation={userLocation}
                  channel={result.channel ?? null}
                  locale={locale}
                />
              </div>
            )}
          </div>
        )}

        {/* Bulky waste: also show donation points accepting Furniture */}
        {donationLoading && result.channel === 'bulky_waste' && (
          <div className="bg-white rounded-card p-4 border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        )}
        {donationPoints.length > 0 && result.channel === 'bulky_waste' && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-caption font-semibold text-gray-700 min-w-0">{t(locale, 'result.considerDonating')}</h3>
              <ViewToggle mode={donationMode} onChange={setDonationMode} locale={locale} />
            </div>
            {donationMode === 'list' ? (
              <div className="space-y-2">
                {donationPoints.slice(0, 5).map((point, i) => (
                  <RecyclingPointCard key={`donation-${point.name}-${i}`} point={point} locale={locale} />
                ))}
              </div>
            ) : (
              <div className="rounded-card overflow-hidden border border-gray-100" style={{ height: '350px' }}>
                <NearbyMapView
                  points={donationPoints.slice(0, 5)}
                  userLocation={userLocation}
                  channel="donation"
                  locale={locale}
                />
              </div>
            )}
          </div>
        )}

        {/* Location / region messages */}
        {(nearbyChannel || isHazardous) && !isHazardous && !userLocation && geoLoading && (
          <div className="bg-blue-50 rounded-card p-4 border border-blue-100 text-center">
            <p className="text-caption text-blue-700 font-medium">{t(locale, 'result.gettingLocation')}</p>
          </div>
        )}
        {nearbyChannel && !userLocation && !geoLoading && (
          <button
            onClick={onRequestLocation}
            className="w-full bg-blue-50 rounded-card p-4 border border-blue-100 text-center active:bg-blue-100/70"
          >
            <p className="text-caption text-blue-700 font-medium">{t(locale, 'result.tapToFind')}</p>
            <p className="text-caption text-blue-500 mt-1">{t(locale, 'result.requiresLocation')}</p>
          </button>
        )}
        {nearbyChannel && userLocation && !isInSingapore && (
          <div className="bg-amber-50 rounded-card p-4 border border-amber-100 text-center">
            <p className="text-caption text-amber-700 font-medium">{t(locale, 'result.onlyInSG')}</p>
            <p className="text-caption text-amber-500 mt-1">{t(locale, 'result.sgDataOnly')}</p>
          </div>
        )}

        {/* Scan again */}
        <button
          onClick={onScanAgain}
          className="w-full py-3.5 rounded-btn bg-nea-green text-white text-body font-medium active:bg-nea-green/90 min-h-btn"
        >
          {t(locale, 'result.scanAnother')}
        </button>
      </div>
    </div>
  );
}
