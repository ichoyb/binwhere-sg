'use client';

import type { Locale } from '@/lib/i18n/types';
import { t } from '@/lib/i18n';
import { CHANNEL_DISPLAY_CONFIG } from '@/lib/constants';

const config = CHANNEL_DISPLAY_CONFIG.hazardous;

interface HazardousInfoCardProps {
  locale: Locale;
}

export default function HazardousInfoCard({ locale }: HazardousInfoCardProps) {
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
          {t(locale, 'hazardous.title')}
        </h3>
      </div>

      <div className="space-y-2.5 text-caption" style={{ color: config.textColor }}>
        <div className="flex items-start gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
          <div>
            <a href="tel:+6562255632" className="font-medium underline underline-offset-2" style={{ color: config.textColor }}>{t(locale, 'hazardous.hotline')}</a>
            <p className="opacity-75">{t(locale, 'hazardous.hotlineHint')}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
