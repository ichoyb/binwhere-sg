import { useCallback, useEffect, useState } from 'react';
import type { Locale } from '@binwhere/core';
import { VALID_LOCALES, normalizeLocale } from '@binwhere/core';
import * as Localization from 'expo-localization';
import { getItem, setItem } from '../lib/storage';

const STORAGE_KEY = 'binwhere-locale';

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getItem<string>(STORAGE_KEY);
        if (!cancelled && stored && VALID_LOCALES.includes(stored as Locale)) {
          setLocaleState(stored as Locale);
        } else if (!cancelled) {
          const tag = Localization.getLocales()?.[0]?.languageTag;
          setLocaleState(normalizeLocale(tag));
        }
      } catch {
        if (!cancelled) {
          const tag = Localization.getLocales()?.[0]?.languageTag;
          setLocaleState(normalizeLocale(tag));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  return { locale, setLocale, ready };
}
