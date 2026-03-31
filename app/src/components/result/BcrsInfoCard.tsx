'use client';

import type { Locale } from '@/lib/i18n/types';
import { t } from '@/lib/i18n';
import { CHANNEL_DISPLAY_CONFIG } from '@/lib/constants';

interface BcrsInfoCardProps {
  locale: Locale;
}

const config = CHANNEL_DISPLAY_CONFIG.return_point;

export default function BcrsInfoCard({ locale }: BcrsInfoCardProps) {
  const steps = [
    t(locale, 'bcrs.step1'),
    t(locale, 'bcrs.step2'),
    t(locale, 'bcrs.step3'),
    t(locale, 'bcrs.step4'),
  ];

  return (
    <div
      className="rounded-card p-4 border space-y-3"
      style={{ backgroundColor: config.bgColor, borderColor: config.borderColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={config.iconPath} />
          </svg>
          <div className="min-w-0">
            <h3 className="text-body font-semibold" style={{ color: config.textColor }}>
              {t(locale, 'bcrs.title')}
            </h3>
            <p className="text-caption text-gray-500">
              {t(locale, 'bcrs.refundAmount')}
            </p>
          </div>
        </div>

        <div
          className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: '#F5E7A1', color: '#7A5D12' }}
        >
          S$0.10
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-2.5">
            <span
              className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: '#FFFFFF', color: config.color }}
            >
              {index + 1}
            </span>
            <span className="text-caption leading-relaxed" style={{ color: config.textColor }}>
              {step}
            </span>
          </li>
        ))}
      </ol>

      <div className="border-t pt-3 space-y-1.5" style={{ borderColor: config.borderColor }}>
        <p className="text-caption font-medium" style={{ color: config.textColor }}>
          {t(locale, 'bcrs.eligible')}
        </p>
        <p className="text-caption text-gray-600">
          {t(locale, 'bcrs.excluded')}
        </p>
      </div>
    </div>
  );
}
