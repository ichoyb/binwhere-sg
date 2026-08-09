import { LocaleSchema, type Locale } from './types';
import en from './locales/en';
import zh from './locales/zh';
import ms from './locales/ms';
import ta from './locales/ta';

export type { Locale } from './types';
export { LocaleSchema } from './types';
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

export const VALID_LOCALES: readonly Locale[] = LocaleSchema.options;

/** Normalize a BCP-47 language tag (or short code) to a supported Locale */
export function normalizeLocale(input?: string | null): Locale {
  if (!input) return 'en';
  const lang = input.toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('ms') || lang.startsWith('may')) return 'ms';
  if (lang.startsWith('ta')) return 'ta';
  if (VALID_LOCALES.includes(lang as Locale)) return lang as Locale;
  return 'en';
}

/** Language name map for AI prompt injection */
export const LOCALE_LANGUAGE_NAME: Record<Locale, string> = {
  en: 'English',
  zh: 'Chinese (Simplified)',
  ms: 'Malay (Bahasa Melayu)',
  ta: 'Tamil',
};
