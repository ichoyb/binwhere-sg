import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClassifyResult, Locale, PlanningArea, ScanHistoryItem } from '@binwhere/core';
import { useHistory } from '../hooks/useHistory';
import { useLocale } from '../hooks/useLocale';
import { useGeolocation, type LocationResult, type UserLocation } from '../hooks/useGeolocation';
import { LOCATION_AREA_KEY, parseStoredArea, resolveLocationResult, type LocationSelection, type ResolvedLocation } from '../lib/location-source';
import { removeItem, setItem } from '../lib/storage';
import { reportError } from '../lib/reporting';

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
  locationReady: boolean;
  locationSelection: LocationSelection;
  locationSource: LocationSelection['locationSource'];
  locationPermission: ReturnType<typeof useGeolocation>['permission'];
  selectArea: (area: PlanningArea) => void;
  useDeviceLocation: () => void;
  getLocationSelection: () => LocationSelection;
  resolveLocation: () => Promise<ResolvedLocation>;
  readGrantedLocation: () => Promise<LocationResult | null>;
  classifyResult: ClassifyResult | null;
  setClassifyResult: (r: ClassifyResult | null) => void;
  capturedImage: string | null;
  setCapturedImage: (uri: string | null) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { locale, setLocale, ready: localeReady } = useLocale();
  const { history, addToHistory, clearHistory, ready: historyReady } = useHistory();
  const [locationReady, setLocationReady] = useState(false);
  const [locationSelection, setLocationSelection] = useState<LocationSelection>({ locationSource: 'device' });
  const selection = useRef(locationSelection);
  const { location, loading: geoLoading, permission: locationPermission, requestLocation,
    readGrantedLocation: readDeviceLocation } = useGeolocation(locationReady && locationSelection.locationSource === 'device');
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const stored = parseStoredArea(await AsyncStorage.getItem(LOCATION_AREA_KEY));
        if (stored.kind === 'valid') {
          selection.current = { locationSource: 'manual', area: stored.area };
          setLocationSelection(selection.current);
        } else if (stored.kind === 'invalid') {
          reportError(new Error('Invalid stored location area'), { operation: 'read-location-area' });
          await removeItem(LOCATION_AREA_KEY).catch((error) => reportError(error, { operation: 'remove-invalid-location-area' }));
        }
      } catch (error) {
        reportError(error, { operation: 'read-location-area' });
      } finally {
        setLocationReady(true);
      }
    })();
  }, []);

  const selectArea = useCallback((area: PlanningArea) => {
    selection.current = { locationSource: 'manual', area };
    setLocationSelection(selection.current);
    void setItem(LOCATION_AREA_KEY, { code: area.code })
      .catch((error) => reportError(error, { operation: 'save-location-area' }));
  }, []);
  const useDeviceLocation = useCallback(() => {
    selection.current = { locationSource: 'device' };
    setLocationSelection(selection.current);
    void removeItem(LOCATION_AREA_KEY)
      .catch((error) => reportError(error, { operation: 'remove-location-area' }));
  }, []);
  const getLocationSelection = useCallback(() => selection.current, []);
  const resolveLocation = useCallback(async () => {
    const source = selection.current;
    if (source.locationSource === 'manual') return resolveLocationResult(source, null, null);
    const result = await requestLocation();
    return resolveLocationResult(source, result.permission, result.location);
  }, [requestLocation]);
  const readGrantedLocation = useCallback(() => selection.current.locationSource === 'device'
    ? readDeviceLocation() : Promise.resolve(null), [readDeviceLocation]);

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
      locationReady,
      locationSelection,
      locationSource: locationSelection.locationSource,
      locationPermission,
      selectArea,
      useDeviceLocation,
      getLocationSelection,
      resolveLocation,
      readGrantedLocation,
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
      locationReady,
      locationSelection,
      locationPermission,
      selectArea,
      useDeviceLocation,
      getLocationSelection,
      resolveLocation,
      readGrantedLocation,
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
