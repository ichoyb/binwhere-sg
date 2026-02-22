'use client';

import { useState } from 'react';
import type { ClassifyResult } from '@/lib/ai/types';
import type { ScanHistoryItem } from '@/types/app';
import { useCamera } from '@/hooks/useCamera';
import { useClassify } from '@/hooks/useClassify';
import CameraPreview from '@/components/home/CameraPreview';
import SnapButton from '@/components/home/SnapButton';
import TextInput from '@/components/home/TextInput';
import HistoryChips from '@/components/home/HistoryChips';
import LoadingOverlay from '@/components/shared/LoadingOverlay';
import ErrorState from '@/components/shared/ErrorState';

interface HomePageProps {
  onClassified: (result: ClassifyResult, image: string | null) => void;
  history: ScanHistoryItem[];
}

export default function HomePage({ onClassified, history }: HomePageProps) {
  const { videoRef, status: cameraStatus, start, capture } = useCamera();
  const { loading, error, classify, reset } = useClassify();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const cameraAvailable = cameraStatus === 'active';
  const cameraNotActive = cameraStatus !== 'active';

  const handleSnap = async () => {
    const image = await capture();
    if (!image) return;
    setCapturedImage(image);
    const result = await classify({ image });
    if (result) {
      onClassified(result, image);
    }
    setCapturedImage(null);
  };

  const handleTextSubmit = async (text: string) => {
    setCapturedImage(null);
    const result = await classify({ text });
    if (result) {
      onClassified(result, null);
    }
  };

  const handleRetry = () => {
    reset();
    setCapturedImage(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      {/* Loading overlay */}
      {loading && <LoadingOverlay capturedImage={capturedImage} />}

      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">
          <span className="text-nea-green">Bin</span>
          <span className="text-blue-bin">Where</span>
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Snap or describe an item to find out how to recycle it</p>
      </header>

      {/* Camera area */}
      <div className="flex-1 px-4 min-h-0">
        <CameraPreview
          videoRef={videoRef}
          status={cameraStatus}
          onStart={start}
        />
      </div>

      {/* Controls */}
      <div className="px-4 py-4 space-y-3">
        {/* Error state */}
        {error && (
          <ErrorState message={error} onRetry={handleRetry} />
        )}

        {/* Snap button — centered below camera */}
        {cameraAvailable && (
          <div className="flex justify-center">
            <SnapButton onClick={handleSnap} disabled={loading} />
          </div>
        )}

        {/* Text input */}
        <TextInput
          onSubmit={handleTextSubmit}
          disabled={loading}
          prominent={cameraNotActive}
        />

        {/* History */}
        <HistoryChips items={history} />
      </div>
    </div>
  );
}
