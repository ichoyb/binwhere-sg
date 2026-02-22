'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { compressImage } from '@/lib/image-utils';

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable';

const CONSTRAINT_FALLBACKS: MediaStreamConstraints[] = [
  { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } } },
  { video: { facingMode: 'environment' } },
  { video: true },
];

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      return;
    }

    setStatus('requesting');

    for (const constraints of CONSTRAINT_FALLBACKS) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('active');
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setStatus('denied');
          return;
        }
        // OverconstrainedError or other — try next fallback
      }
    }

    setStatus('unavailable');
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  const capture = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return compressImage(canvas);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return { videoRef, status, start, stop, capture };
}
