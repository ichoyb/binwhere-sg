'use client';

import { useState, useCallback, useRef } from 'react';

interface UseGeolocationReturn {
  location: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
  /** Request location on demand (e.g. when user navigates to result page) */
  requestLocation: () => void;
}

/** Manual safety timeout — covers browsers that ignore the API timeout during permission prompts */
const SAFETY_TIMEOUT_MS = 15_000;

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestedRef = useRef(false);

  const requestLocation = useCallback(() => {
    // Already have location or already in-flight
    if (location || loading) return;

    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    requestedRef.current = true;
    setLoading(true);
    setError(null);

    let settled = false;
    const settle = () => { settled = true; };

    // Safety timer: force-resolve if browser hangs (permission prompt ignored, etc.)
    const timer = setTimeout(() => {
      if (!settled) {
        settle();
        setError('Location request timed out');
        setLoading(false);
      }
    }, SAFETY_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settle();
        clearTimeout(timer);
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        if (settled) return;
        settle();
        clearTimeout(timer);
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 300_000, // 5 min cache
      },
    );
  }, [location, loading]);

  return { location, error, loading, requestLocation };
}
