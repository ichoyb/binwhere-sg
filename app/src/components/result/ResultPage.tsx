'use client';

import type { ClassifyResult } from '@/lib/ai/types';
import StatusCard from '@/components/result/StatusCard';
import ConfidenceBadge from '@/components/result/ConfidenceBadge';
import PreparationList from '@/components/result/PreparationList';
import NearestPoint from '@/components/result/NearestPoint';
import { useNearby } from '@/hooks/useNearby';
import { CHANNEL_LABELS } from '@/types/recycling';
import { CHANNEL_TO_NEARBY } from '@/lib/constants';

interface ResultPageProps {
  result: ClassifyResult;
  capturedImage: string | null;
  userLocation: { lat: number; lng: number } | null;
  onScanAgain: () => void;
  onViewNearby: () => void;
}

export default function ResultPage({
  result,
  capturedImage,
  userLocation,
  onScanAgain,
  onViewNearby,
}: ResultPageProps) {
  const nearbyChannel = result.channel ? CHANNEL_TO_NEARBY[result.channel] : null;
  const { points, loading: nearbyLoading } = useNearby(
    userLocation,
    nearbyChannel,
  );

  const nearest = points[0] ?? null;
  const hasMorePoints = points.length > 1;

  return (
    <div className="min-h-full bg-bg">
      {/* Header with captured image */}
      {capturedImage && (
        <div className="w-full h-40 relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/jpeg;base64,${capturedImage}`}
            alt="Scanned item"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg" />
        </div>
      )}

      <div className="px-4 pb-8 space-y-3" style={{ marginTop: capturedImage ? '-24px' : '16px' }}>
        {/* Status Card */}
        <StatusCard result={result} />

        {/* Low confidence warning */}
        <ConfidenceBadge confidence={result.confidence} />

        {/* Preparation steps */}
        {result.preparation && result.preparation.length > 0 && (
          <PreparationList steps={result.preparation} />
        )}

        {/* Tip */}
        {result.tip && (
          <div className="bg-white rounded-card p-4 border border-gray-100">
            <p className="text-sm text-gray-600">
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
        {nearest && <NearestPoint point={nearest} />}

        {/* View more nearby points */}
        {hasMorePoints && nearbyChannel && (
          <button
            onClick={onViewNearby}
            className="w-full py-3 rounded-btn border border-blue-bin text-blue-bin text-sm font-medium active:bg-blue-bin/5"
          >
            View more {result.channel ? CHANNEL_LABELS[result.channel] : ''} points nearby
          </button>
        )}

        {/* No location message */}
        {!userLocation && nearbyChannel && (
          <p className="text-center text-xs text-gray-400">
            Enable location access to find nearby recycling points
          </p>
        )}

        {/* Scan again */}
        <button
          onClick={onScanAgain}
          className="w-full py-3.5 rounded-btn bg-nea-green text-white font-medium active:bg-nea-green/90"
        >
          Scan Another Item
        </button>
      </div>
    </div>
  );
}
