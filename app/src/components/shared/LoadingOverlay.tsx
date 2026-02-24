'use client';

import { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  'Identifying item...',
  'Checking recycling rules...',
  'Finding nearest bin...',
  'Almost there...',
];

interface LoadingOverlayProps {
  capturedImage?: string | null;
}

export default function LoadingOverlay({ capturedImage }: LoadingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/60">
      {capturedImage && (
        <div className="relative w-48 h-48 rounded-card overflow-hidden mb-6 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/jpeg;base64,${capturedImage}`}
            alt="Captured"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 animate-shimmer" />
        </div>
      )}
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white text-sm font-medium transition-opacity duration-300">
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </div>
    </div>
  );
}
