import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { reportError } from '../lib/reporting';
import type { Coordinates } from '../lib/location-source';

export type UserLocation = Coordinates;
export interface LocationResult {
  location: UserLocation | null;
  permission: Location.PermissionStatus | null;
}

export function useGeolocation(enabled: boolean) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permission, setPermission] = useState<Location.LocationPermissionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const active = useRef(enabled);
  active.current = enabled;

  const readLocation = useCallback(async (): Promise<UserLocation> => {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (active.current) setLocation(next);
    return next;
  }, []);

  const readPermission = useCallback(async () => {
    const current = await Location.getForegroundPermissionsAsync();
    if (active.current) {
      setPermission(current);
      if (!current.granted) setLocation(null);
    }
    return current;
  }, []);

  const requestLocation = useCallback(async (): Promise<LocationResult> => {
    setLoading(true);
    let status: Location.PermissionStatus | null = null;
    try {
      const current = await Location.requestForegroundPermissionsAsync();
      status = current.status;
      if (active.current) setPermission(current);
      if (!current.granted) {
        if (active.current) setLocation(null);
        return { location: null, permission: status };
      }
      if (!active.current) return { location: null, permission: status };
      return { location: await readLocation(), permission: status };
    } catch {
      if (active.current) setLocation(null);
      return { location: null, permission: status };
    } finally {
      setLoading(false);
    }
  }, [readLocation]);

  const readGrantedLocation = useCallback(async (): Promise<LocationResult | null> => {
    let status: Location.PermissionStatus | null = null;
    try {
      const current = await readPermission();
      status = current.status;
      if (!active.current || !current.granted) return null;
      return { location: await readLocation(), permission: status };
    } catch { return { location: null, permission: status }; }
  }, [readLocation, readPermission]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void readPermission().then(async (current) => {
      if (cancelled || !active.current || !current.granted) return;
      setLoading(true);
      try {
        await readLocation();
      } catch {
        // Background failures leave location unavailable; only explicit requests show the reason.
      } finally {
        setLoading(false);
      }
    }, (failure) => {
      if (!cancelled) reportError(failure, { operation: 'startup-location-permission' });
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void readPermission().catch((failure) => {
          if (!cancelled) reportError(failure, { operation: 'refresh-location-permission' });
        });
      }
    });
    return () => { cancelled = true; subscription.remove(); };
  }, [enabled, readLocation, readPermission]);

  return { location, permission, loading, requestLocation, readGrantedLocation };
}
