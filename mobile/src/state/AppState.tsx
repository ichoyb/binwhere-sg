import React, { createContext, useContext, useMemo, useState } from 'react';
import type { ClassifyResult, Locale, ScanHistoryItem } from '@binwhere/core';
import { useHistory } from '../hooks/useHistory';
import { useLocale } from '../hooks/useLocale';
import { useGeolocation, type UserLocation } from '../hooks/useGeolocation';

interface AppStateValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  localeReady: boolean;
  history: ScanHistoryItem[];
  addToHistory: (result: ClassifyResult, locale?: Locale) => void;
  clearHistory: () => void;
  historyReady: boolean;
  location: UserLocation | null;
  geoLoading: boolean;
  geoError: string | null;
  requestLocation: () => Promise<UserLocation | null>;
  classifyResult: ClassifyResult | null;
  setClassifyResult: (r: ClassifyResult | null) => void;
  capturedImage: string | null;
  setCapturedImage: (uri: string | null) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { locale, setLocale, ready: localeReady } = useLocale();
  const { history, addToHistory, clearHistory, ready: historyReady } = useHistory();
  const { location, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const value = useMemo<AppStateValue>(
    () => ({
      locale,
      setLocale,
      localeReady,
      history,
      addToHistory,
      clearHistory,
      historyReady,
      location,
      geoLoading,
      geoError,
      requestLocation,
      classifyResult,
      setClassifyResult,
      capturedImage,
      setCapturedImage,
    }),
    [
      locale,
      setLocale,
      localeReady,
      history,
      addToHistory,
      clearHistory,
      historyReady,
      location,
      geoLoading,
      geoError,
      requestLocation,
      classifyResult,
      capturedImage,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
