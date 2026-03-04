'use client';

import { CHANNEL_DISPLAY_CONFIG } from '@/lib/constants';

const config = CHANNEL_DISPLAY_CONFIG.hazardous;

export default function HazardousInfoCard() {
  return (
    <div
      className="rounded-card p-4 border space-y-3"
      style={{ backgroundColor: config.bgColor, borderColor: config.borderColor }}
    >
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={config.iconPath} />
        </svg>
        <h3 className="text-body font-semibold" style={{ color: config.textColor }}>
          How to Dispose of Hazardous Waste
        </h3>
      </div>

      <div className="space-y-2.5 text-caption" style={{ color: config.textColor }}>
        <div className="flex items-start gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
          <div>
            <a href="tel:+6562255632" className="font-medium underline underline-offset-2" style={{ color: config.textColor }}>NEA Hotline: 6225 5632</a>
            <p className="opacity-75">Tap to call for disposal guidance</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <div>
            <a
              href="https://www.nea.gov.sg/our-services/pollution-control/toxic-industrial-waste"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2"
              style={{ color: config.textColor }}
            >
              NEA Toxic Waste Info
            </a>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <p>Expired medicine can be returned to pharmacies (Guardian / Watsons)</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div>
            <p>NEA holds regular community hazardous waste collection events</p>
          </div>
        </div>
      </div>
    </div>
  );
}
