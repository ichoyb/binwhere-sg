'use client';

interface LoadingOverlayProps {
  capturedImage?: string | null;
}

export default function LoadingOverlay({ capturedImage }: LoadingOverlayProps) {
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
        <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white text-sm font-medium">Analyzing...</p>
      </div>
    </div>
  );
}
