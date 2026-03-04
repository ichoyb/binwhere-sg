'use client';

import type { Locale } from '@/lib/i18n/types';
import { t } from '@/lib/i18n';

interface ViewToggleProps {
  mode: 'list' | 'map';
  onChange: (mode: 'list' | 'map') => void;
  locale: Locale;
}

export default function ViewToggle({ mode, onChange, locale }: ViewToggleProps) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200">
      <button
        onClick={() => onChange('list')}
        className={`px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
          mode === 'list'
            ? 'bg-blue-bin text-white'
            : 'bg-white text-gray-600 active:bg-gray-50'
        }`}
      >
        {t(locale, 'shared.list')}
      </button>
      <button
        onClick={() => onChange('map')}
        className={`px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
          mode === 'map'
            ? 'bg-blue-bin text-white'
            : 'bg-white text-gray-600 active:bg-gray-50'
        }`}
      >
        {t(locale, 'shared.map')}
      </button>
    </div>
  );
}
