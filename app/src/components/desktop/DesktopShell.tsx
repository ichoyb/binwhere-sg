'use client';

import { type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const SITE_URL = 'https://binwhere.sg';

const FEATURES = [
  { icon: '📸', text: 'Snap & identify any item' },
  { icon: '♻️', text: 'Find nearest recycling bin' },
  { icon: '📍', text: '12,000+ collection points' },
];

export default function DesktopShell({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <div className="desktop-shell">
      {/* Left: Brand info */}
      <div className="desktop-brand">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-emerald-400">Bin</span>
            <span className="text-sky-400">Where</span>
          </h1>
          <p className="mt-2 text-lg text-gray-300">
            Singapore&apos;s Smart Recycling Guide
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Snap or describe any item — we&apos;ll tell you how and where to recycle it.
          </p>
        </div>

        <ul className="mt-8 space-y-3">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-center gap-3 text-gray-300">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm">{f.text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-start gap-3">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={SITE_URL} size={120} />
          </div>
          <p className="text-xs text-gray-500">
            Scan to open on your phone
          </p>
        </div>
      </div>

      {/* Right: Phone frame */}
      <div className="phone-frame">
        {/* Notch */}
        <div className="phone-notch" />
        {/* App content */}
        <div className="phone-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
