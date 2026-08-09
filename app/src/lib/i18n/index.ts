/**
 * Web i18n surface: pure helpers from @binwhere/core + browser persistence.
 */
export type { Locale, TranslationKey } from '@binwhere/core';
export {
  t,
  LOCALE_OPTIONS,
  VALID_LOCALES,
  normalizeLocale,
  LOCALE_LANGUAGE_NAME,
} from '@binwhere/core';

import type { Locale } from '@binwhere/core';
import { VALID_LOCALES, normalizeLocale } from '@binwhere/core';

const LOCALE_STORAGE_KEY = 'binwhere-locale';

/** Detect locale from localStorage or navigator.language (web only) */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && VALID_LOCALES.includes(stored as Locale)) {
    return stored as Locale;
  }

  return normalizeLocale(navigator.language);
}

/** Persist locale choice (web only) */
export function saveLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
}
