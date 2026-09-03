'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CameraStatus } from '@/hooks/useCamera';
import type { Locale } from '@/lib/i18n/types';
import { t } from '@/lib/i18n';
import LogoIcon from '@/components/shared/LogoIcon';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  onStart: () => void;
  onBcrsEntry?: () => void;
  locale: Locale;
}

/** Idle-state banner carousel: Snap to Know ↔ BCRS */
function IdleCarousel({ onStart, onBcrsEntry, locale }: {
  onStart: () => void;
  onBcrsEntry?: () => void;
  locale: Locale;
}) {
  const [page, setPage] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const goTo = useCallback((target: number) => {
    setFading(true);
    setTimeout(() => {
      setPage(target);
      setFading(false);
    }, 300);
  }, []);

  // Auto-rotate
  useEffect(() => {
    timerRef.current = setInterval(() => {
      goTo(page === 0 ? 1 : 0);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [page, goTo]);

  const handleDotClick = (target: number) => {
    if (target === page) return;
    clearInterval(timerRef.current);
    goTo(target);
  };

  // Swipe support
  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      clearInterval(timerRef.current);
      goTo(dx < 0 ? 1 : 0);
    }
  };

  return (
    <div
      className="h-[280px] relative rounded-card overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="absolute inset-0 flex flex-col items-center justify-center p-6 pb-10 text-center transition-opacity duration-300"
        style={{
          opacity: fading ? 0 : 1,
          background: page === 0
            ? 'linear-gradient(135deg, #00A651 0%, #E8F8EF 100%)'
            : 'linear-gradient(135deg, #022c22 0%, #065F46 100%)',
        }}
      >
        {page === 0 ? (
          <>
            <LogoIcon size={72} className="mb-3 opacity-90" />
            <h2 className="text-xl font-bold text-white mb-1 drop-shadow-sm">
              {t(locale, 'home.snapToKnow')}
            </h2>
            <p className="text-base text-white/85 mb-4 drop-shadow-sm">
              {t(locale, 'home.recycleRight')}
            </p>
            <button
              onClick={onStart}
              className="px-6 py-3 bg-white text-nea-green font-semibold rounded-full text-base shadow-lg active:scale-95 transition-transform min-h-btn"
            >
              {t(locale, 'home.openCamera')}
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-emerald-300">$</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1 drop-shadow-sm">
              {t(locale, 'bcrs.title')}
            </h2>
            <p className="text-base text-emerald-200/90 mb-1 drop-shadow-sm">
              {t(locale, 'bcrs.refundAmount')}
            </p>
            <p className="text-sm text-emerald-300/60 mb-4">
              {t(locale, 'bcrs.pointCount')}
            </p>
            <button
              onClick={onBcrsEntry}
              className="px-5 py-3 bg-white text-emerald-700 font-semibold rounded-full text-sm shadow-lg active:scale-95 transition-transform min-h-btn max-w-[85%]"
            >
              {t(locale, 'bcrs.findNearby')}
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      <div className="absolute bottom-2.5 left-0 right-0 flex items-center justify-center gap-2">
        {[0, 1].map((i) => (
          <button
            key={i}
            onClick={() => handleDotClick(i)}
            className={`rounded-full transition-all duration-300 ${
              page === i ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function CameraPreview({ videoRef, status, onStart, onBcrsEntry, locale }: CameraPreviewProps) {
  if (status === 'idle') {
    return <IdleCarousel onStart={onStart} onBcrsEntry={onBcrsEntry} locale={locale} />;
  }

  if (status === 'denied') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 rounded-card p-6 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-gray-400 mb-3">
          <path d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M2 8V6a2 2 0 012-2h2l2-2h4l2 2h2a2 2 0 012 2v2M2 8v10a2 2 0 002 2h12a2 2 0 002-2V8M2 8h14" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p className="text-gray-600 font-medium mb-1 text-body">{t(locale, 'home.cameraDenied')}</p>
        <p className="text-gray-400 text-caption">{t(locale, 'home.cameraDeniedHint')}</p>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 rounded-card p-6 text-center">
        <p className="text-gray-600 font-medium mb-1 text-body">{t(locale, 'home.cameraUnavailable')}</p>
        <p className="text-gray-400 text-caption">{t(locale, 'home.cameraUnavailableHint')}</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 bg-black rounded-card overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {status === 'requesting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
