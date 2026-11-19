import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import type { CapturedPhoto } from '../lib/image-prep';
import { reportError } from '../lib/reporting';

export type CameraUiStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unavailable';

export function useCamera() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void getPermission().then((current) => setActive(current.granted))
          .catch((error) => reportError(error, { operation: 'refresh-camera-permission' }));
      }
    });
    return () => subscription.remove();
  }, [getPermission]);

  const status: CameraUiStatus = (() => {
    // permission object missing while module bootstraps
    if (!permission) return 'requesting';
    if (!permission.granted) {
      // User permanently denied, or denied this session after asking
      if (!permission.canAskAgain) return 'denied';
      // Still idle until user taps Open Camera (which will prompt)
      return 'idle';
    }
    if (active) return 'active';
    return 'idle';
  })();

  const start = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setActive(false);
        return false;
      }
    }
    setActive(true);
    return true;
  }, [permission?.granted, requestPermission]);

  const stop = useCallback(() => {
    setActive(false);
  }, []);

  const capture = useCallback(async (): Promise<CapturedPhoto | null> => {
    if (!cameraRef.current || busy) return null;
    setBusy(true);
    try {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // haptics optional on simulators
      }
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      // With processing on, the reported size already reflects the photo's orientation.
      return photo ? { uri: photo.uri, width: photo.width, height: photo.height } : null;
    } catch {
      return null;
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return {
    cameraRef,
    status,
    permission,
    active,
    busy,
    start,
    stop,
    capture,
    requestPermission,
  };
}
