'use client';

import type { CameraStatus } from '@/hooks/useCamera';
import type { Locale } from '@/lib/i18n/types';
import { t } from '@/lib/i18n';
import LogoIcon from '@/components/shared/LogoIcon';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  onStart: () => void;
  locale: Locale;
}

export default function CameraPreview({ videoRef, status, onStart, locale }: CameraPreviewProps) {
  if (status === 'idle') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center rounded-card p-6 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #00A651 0%, #E8F8EF 100%)' }}
      >
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
      </div>
    );
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
