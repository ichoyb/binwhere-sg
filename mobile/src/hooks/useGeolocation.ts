import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { reportError } from '../lib/reporting';

export interface UserLocation {
  lat: number;
  lng: number;
}

export type LocationResult =
  | { location: UserLocation; error: null }
  | { location: null; error: 'permission_denied' | 'location_failed' };

export function useGeolocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readLocation = useCallback(async (): Promise<LocationResult> => {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setLocation(next);
    return { location: next, error: null };
  }, []);

  const requestLocation = useCallback(async (): Promise<LocationResult> => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('permission_denied');
        setLocation(null);
        return { location: null, error: 'permission_denied' };
      }
      return await readLocation();
    } catch {
      setError('location_failed');
      setLocation(null);
      return { location: null, error: 'location_failed' };
    } finally {
      setLoading(false);
    }
  }, [readLocation]);

  const readGrantedLocation = useCallback(async (): Promise<LocationResult | null> => {
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') return null;
      return await readLocation();
    } catch {
      return { location: null, error: 'location_failed' };
    }
  }, [readLocation]);

  useEffect(() => {
    void Location.getForegroundPermissionsAsync().then(async ({ status }) => {
      if (status === 'granted') {
        setLoading(true);
        try {
          await readLocation();
        } catch {
          // Background failures leave location unavailable; only explicit requests show the reason.
        } finally {
          setLoading(false);
        }
      }
    }, (failure) => {
      reportError(failure, { operation: 'startup-location-permission' });
    });
  }, [readLocation]);

  return { location, loading, error, requestLocation, readGrantedLocation };
}
