'use client';

import { useState, useRef, useEffect } from 'react';
import type { Locale } from '@/lib/i18n/types';
import { LOCALE_OPTIONS, saveLocale } from '@/lib/i18n';

interface LanguageSelectorProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
}

export default function LanguageSelector({ locale, onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentShort = LOCALE_OPTIONS.find((o) => o.value === locale)?.short ?? 'EN';

  const handleSelect = (value: Locale) => {
    saveLocale(value);
    onChange(value);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
        aria-label="Select language"
      >
        {currentShort}
        <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[80px]">
          {LOCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full text-left px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                option.value === locale
                  ? 'bg-nea-green/10 text-nea-green font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
              }`}
            >
              <span className="font-semibold">{option.short}</span><span className="ml-1.5 font-normal text-gray-400">{option.native}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
