import type { Locale } from './types';
import en from './locales/en';
import zh from './locales/zh';
import ms from './locales/ms';
import ta from './locales/ta';

export type { Locale } from './types';
export type TranslationKey = keyof typeof en;

const translations: Record<Locale, Record<string, string>> = { en, zh, ms, ta };

/** Get translated string with English fallback */
export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? en[key] ?? key;
}

export const LOCALE_OPTIONS: { value: Locale; short: string; native: string }[] = [
  { value: 'en', short: 'EN', native: 'English' },
  { value: 'zh', short: 'ZH', native: '中文' },
  { value: 'ms', short: 'BM', native: 'Melayu' },
  { value: 'ta', short: 'TA', native: 'தமிழ்' },
];

const LOCALE_STORAGE_KEY = 'binwhere-locale';
const VALID_LOCALES: Locale[] = ['en', 'zh', 'ms', 'ta'];

/** Detect locale from localStorage or navigator.language */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';

  // Check localStorage first
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && VALID_LOCALES.includes(stored as Locale)) {
    return stored as Locale;
  }

  // Detect from browser language
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('ms') || lang.startsWith('may')) return 'ms';
  if (lang.startsWith('ta')) return 'ta';
  return 'en';
}

/** Persist locale choice */
export function saveLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
}

/** Language name map for AI prompt injection */
export const LOCALE_LANGUAGE_NAME: Record<Locale, string> = {
  en: 'English',
  zh: 'Chinese (Simplified)',
  ms: 'Malay (Bahasa Melayu)',
  ta: 'Tamil',
};
