'use client';

import type { CameraStatus } from '@/hooks/useCamera';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  onStart: () => void;
}

export default function CameraPreview({ videoRef, status, onStart }: CameraPreviewProps) {
  if (status === 'idle') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 rounded-card p-8 text-center">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-nea-green mb-4">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Scan an item</h2>
        <p className="text-sm text-gray-400 mb-6">Tap to open camera and identify recyclables</p>
        <button
          onClick={onStart}
          className="px-8 py-3 bg-nea-green text-white font-semibold rounded-full text-base shadow-md active:scale-95 transition-transform"
        >
          Open Camera
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
        <p className="text-gray-600 font-medium mb-1">Camera access denied</p>
        <p className="text-gray-400 text-sm">Use the text input below to describe your item instead</p>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 rounded-card p-6 text-center">
        <p className="text-gray-600 font-medium mb-1">Camera not available</p>
        <p className="text-gray-400 text-sm">Use the text input below to describe your item</p>
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
