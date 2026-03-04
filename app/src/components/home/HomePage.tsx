'use client';

import { useState } from 'react';
import type { ClassifyResult } from '@/lib/ai/types';
import type { ScanHistoryItem } from '@/types/app';
import type { Locale } from '@/lib/i18n/types';
import { useCamera } from '@/hooks/useCamera';
import { useClassify } from '@/hooks/useClassify';
import CameraPreview from '@/components/home/CameraPreview';
import SnapButton from '@/components/home/SnapButton';
import TextInput from '@/components/home/TextInput';
import HistoryChips from '@/components/home/HistoryChips';
import LoadingOverlay from '@/components/shared/LoadingOverlay';
import ErrorState from '@/components/shared/ErrorState';
import CategorySelector from '@/components/home/CategorySelector';
import LogoIcon from '@/components/shared/LogoIcon';
import LanguageSelector from '@/components/shared/LanguageSelector';

interface HomePageProps {
  onClassified: (result: ClassifyResult, image: string | null) => void;
  onCategorySelect: (result: ClassifyResult) => void;
  onHistorySelect: (item: ScanHistoryItem) => void;
  onHistoryClear: () => void;
  history: ScanHistoryItem[];
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export default function HomePage({ onClassified, onCategorySelect, onHistorySelect, onHistoryClear, history, locale, onLocaleChange }: HomePageProps) {
  const { videoRef, status: cameraStatus, start, capture } = useCamera();
  const { loading, error, classify, reset } = useClassify();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const cameraAvailable = cameraStatus === 'active';
  const cameraNotActive = cameraStatus !== 'active';

  const handleSnap = async () => {
    const image = await capture();
    if (!image) return;
    setFlash(true);
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => setFlash(false), 200);
    setCapturedImage(image);
    const result = await classify({ image, locale });
    if (result) {
      onClassified(result, image);
    }
    setCapturedImage(null);
  };

  const handleTextSubmit = async (text: string) => {
    setCapturedImage(null);
    const result = await classify({ text, locale });
    if (result) {
      onClassified(result, null);
    }
  };

  const handleRetry = () => {
    reset();
    setCapturedImage(null);
  };

  return (
    <div className="flex flex-col min-h-full bg-bg">
      {/* Loading overlay */}
      {loading && <LoadingOverlay capturedImage={capturedImage} locale={locale} />}

      {/* Header */}
      <header className="px-4 pb-2 flex items-center justify-between" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-1.5">
          <LogoIcon size={28} />
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            <span className="text-nea-green">Bin</span>
            <span className="text-blue-bin">Where</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageSelector locale={locale} onChange={onLocaleChange} />
          <div className="w-px h-4 bg-gray-200" />
          {[
            { color: '#0077B6', value: '12.5k', delay: '0s',
              icon: 'M6 7h12l-1 12H7L6 7zM4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2' },
            { color: '#00897B', value: '718', delay: '1s',
              icon: 'M4 5h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm4 14h8m-4-3v3' },
            { color: '#D4A017', value: '401', delay: '2s',
              icon: 'M8 2l-5 5 3 1 1 13h10l1-13 3-1-5-5c-1 1-2.5 2-4 2S9 3 8 2z' },
            { color: '#8E24AA', value: '75', delay: '3s',
              icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
          ].map((s) => (
            <div key={s.color} className="flex items-center gap-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.icon} />
              </svg>
              <span className="text-[10px] font-medium text-gray-400">{s.value}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Camera area — flex-1 only when camera active (video needs full space) */}
      <div className={`${cameraStatus === 'idle' ? '' : 'flex-1'} flex flex-col px-4 min-h-0 relative`}>
        <CameraPreview
          videoRef={videoRef}
          status={cameraStatus}
          onStart={start}
          locale={locale}
        />
        {flash && (
          <div className="absolute inset-0 bg-white rounded-card animate-shutter-flash pointer-events-none" />
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-4 space-y-3" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        {/* Error state */}
        {error && (
          <ErrorState message={error} onRetry={handleRetry} locale={locale} />
        )}

        {/* Snap button — centered below camera */}
        {cameraAvailable && (
          <div className="flex justify-center">
            <SnapButton onClick={handleSnap} disabled={loading} />
          </div>
        )}

        {/* Text input + category selector */}
        <div>
          <TextInput
            onSubmit={handleTextSubmit}
            disabled={loading}
            prominent={cameraNotActive}
            locale={locale}
          />
          <div className="mt-1.5">
            <CategorySelector onSelect={onCategorySelect} disabled={loading} locale={locale} />
          </div>
        </div>

        {/* History */}
        <HistoryChips items={history} onSelect={onHistorySelect} onClear={onHistoryClear} locale={locale} />
      </div>
    </div>
  );
}
