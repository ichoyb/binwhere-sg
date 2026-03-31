'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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

const STAT_PAGES = [
  [
    { color: '#0077B6', value: '12.5k',
      icon: 'M6 7h12l-1 12H7L6 7zM4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2' },
    { color: '#00897B', value: '718',
      icon: 'M4 5h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm4 14h8m-4-3v3' },
    { color: '#D4A017', value: '401',
      icon: 'M8 2l-5 5 3 1 1 13h10l1-13 3-1-5-5c-1 1-2.5 2-4 2S9 3 8 2z' },
    { color: '#8E24AA', value: '75',
      icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
  ],
  [
    { color: '#00A651', value: '1,060',
      icon: 'M4 12a8 8 0 0113.86-5.66M20 12a8 8 0 01-13.86 5.66M17 3v4h-4M7 21v-4h4M12 8v8m-3-4h6' },
    { color: '#00A651', value: 'BCRS',
      icon: 'M21 12a9 9 0 01-9 9m0 0a9 9 0 01-9-9m9 9V3m0 0L8 8m4-5l4 5' },
  ],
];

function HeaderStats() {
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPage((p) => (p + 1) % STAT_PAGES.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-[150px] h-4 overflow-hidden">
      <div
        className="absolute inset-0 flex items-center justify-end gap-1.5 transition-opacity duration-400"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {STAT_PAGES[page].map((s) => (
          <div key={s.value} className="flex items-center gap-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={s.icon} />
            </svg>
            <span className="text-[10px] font-medium text-gray-400">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface HomePageProps {
  onClassified: (result: ClassifyResult, image: string | null) => void;
  onCategorySelect: (result: ClassifyResult) => void;
  onHistorySelect: (item: ScanHistoryItem) => void;
  onHistoryClear: () => void;
  history: ScanHistoryItem[];
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onBcrsEntry: () => void;
}

export default function HomePage({ onClassified, onCategorySelect, onHistorySelect, onHistoryClear, history, locale, onLocaleChange, onBcrsEntry }: HomePageProps) {
  const { videoRef, status: cameraStatus, start, capture } = useCamera();
  const { loading, error, classify, reset } = useClassify();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const cameraAvailable = cameraStatus === 'active';
  const cameraNotActive = cameraStatus !== 'active';

  // Pull-down reveal
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const [pullY, setPullY] = useState(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      setPullY(Math.min(dy * 0.35, 36));
    } else {
      isPulling.current = false;
      setPullY(0);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    isPulling.current = false;
    setPullY(0);
  }, []);

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
    <div
      className="min-h-full bg-bg overflow-hidden relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-down reveal */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-center h-9 pointer-events-none"
        style={{ opacity: pullY > 8 ? Math.min((pullY - 8) / 20, 1) : 0 }}
      >
        <span className="text-[10px] text-gray-400 tracking-wide">Powered by BinWhere AI</span>
      </div>

      {/* Main content */}
      <div
        className="flex flex-col min-h-full"
        style={{
          transform: `translateY(${pullY}px)`,
          transition: pullY === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
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
          <HeaderStats />
        </div>
      </header>

      {/* Camera area — flex-1 only when camera active (video needs full space) */}
      <div className={`${cameraStatus === 'idle' ? '' : 'flex-1'} flex flex-col px-4 min-h-0 relative`}>
        <CameraPreview
          videoRef={videoRef}
          status={cameraStatus}
          onStart={start}
          onBcrsEntry={onBcrsEntry}
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
    </div>
  );
}
