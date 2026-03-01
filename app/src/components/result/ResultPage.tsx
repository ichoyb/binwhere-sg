'use client';

import type { ClassifyResult } from '@/lib/ai/types';
import { STATUS_CONFIG } from '@/lib/constants';
import ConfidenceBadge from '@/components/result/ConfidenceBadge';
import RecyclingPointCard from '@/components/shared/RecyclingPointCard';
import StatusIcon from '@/components/shared/StatusIcon';
import { useNearby } from '@/hooks/useNearby';
import { CHANNEL_LABELS } from '@/types/recycling';
import { CHANNEL_TO_NEARBY, CHANNEL_DISPLAY_CONFIG } from '@/lib/constants';

interface ResultPageProps {
  result: ClassifyResult;
  capturedImage: string | null;
  userLocation: { lat: number; lng: number } | null;
  geoLoading?: boolean;
  onScanAgain: () => void;
  onViewNearby: () => void;
}

async function handleShare(result: ClassifyResult) {
  const text = `${result.item} — ${STATUS_CONFIG[result.status].label}. ${result.reason}`;
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
  onViewNearby,
}: ResultPageProps) {
  const nearbyChannel = result.channel ? CHANNEL_TO_NEARBY[result.channel] : null;
  const isInSingapore = userLocation
    ? userLocation.lat >= 1.15 && userLocation.lat <= 1.47 && userLocation.lng >= 103.6 && userLocation.lng <= 104.05
    : false;

  const { points, loading: nearbyLoading } = useNearby(
    isInSingapore ? userLocation : null,
    nearbyChannel,
  );

  const nearest = points[0] ?? null;
  const hasMorePoints = points.length > 1;
  const config = STATUS_CONFIG[result.status];

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
            <span className="text-body font-medium">Back</span>
          </button>
          <button
            onClick={() => handleShare(result)}
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
            className="inline-block mt-2 px-3 py-0.5 rounded-full text-caption font-semibold"
            style={{ backgroundColor: `${config.color}20`, color: config.textColor }}
          >
            {config.label}
          </span>
          <h2 className="text-lg font-bold mt-1.5 line-clamp-2" style={{ color: config.textColor }}>
            {result.item}
          </h2>
          {result.channel && (
            <span className="text-caption mt-1" style={{ color: config.textColor, opacity: 0.7 }}>
              {CHANNEL_LABELS[result.channel]}
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: `${ch.color}12`, color: ch.textColor }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ch.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ch.iconPath} />
                </svg>
                <span className="text-caption font-semibold">{ch.instruction}</span>
              </div>
            );
          })()}

          {/* Preparation steps */}
          {result.preparation && result.preparation.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-caption font-semibold text-gray-700 mb-2">Before you go</h4>
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
        <ConfidenceBadge confidence={result.confidence} />

        {/* Tip */}
        {result.tip && (
          <div className="bg-white rounded-card p-4 border border-gray-100">
            <p className="text-body text-gray-600">
              <span className="font-medium text-gray-700">Tip: </span>
              {result.tip}
            </p>
          </div>
        )}

        {/* Nearest point */}
        {nearbyLoading && (
          <div className="bg-white rounded-card p-4 border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        )}
        {nearest && (
          <RecyclingPointCard
            point={nearest}
            heading={`Nearest ${nearbyChannel === 'blue_bin' ? 'Blue Bin' : nearbyChannel === 'ewaste' ? 'E-Waste Point' : 'Point'}`}
          />
        )}

        {/* View more nearby points */}
        {hasMorePoints && nearbyChannel && (
          <button
            onClick={onViewNearby}
            className="w-full py-3 rounded-btn border border-blue-bin text-blue-bin text-body font-medium active:bg-blue-bin/5 min-h-btn"
          >
            See All Nearby
          </button>
        )}

        {/* Location / region messages */}
        {nearbyChannel && !userLocation && geoLoading && (
          <div className="bg-blue-50 rounded-card p-4 border border-blue-100 text-center">
            <p className="text-caption text-blue-700 font-medium">Getting your location...</p>
          </div>
        )}
        {nearbyChannel && !userLocation && !geoLoading && (
          <div className="bg-blue-50 rounded-card p-4 border border-blue-100 text-center">
            <p className="text-caption text-blue-700 font-medium">Enable location to find nearby bins</p>
            <p className="text-caption text-blue-500 mt-1">Allow location access in your browser settings</p>
          </div>
        )}
        {nearbyChannel && userLocation && !isInSingapore && (
          <div className="bg-amber-50 rounded-card p-4 border border-amber-100 text-center">
            <p className="text-caption text-amber-700 font-medium">Nearby bins only available in Singapore</p>
            <p className="text-caption text-amber-500 mt-1">Recycling point data covers Singapore only</p>
          </div>
        )}

        {/* Scan again */}
        <button
          onClick={onScanAgain}
          className="w-full py-3.5 rounded-btn bg-nea-green text-white text-body font-medium active:bg-nea-green/90 min-h-btn"
        >
          Scan Another Item
        </button>
      </div>
    </div>
  );
}
