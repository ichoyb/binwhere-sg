import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFriendlyApiError, getFriendlyError, t, type ClassifyResult, type Locale } from '@binwhere/core';
import { ApiError, classifyItem } from '../api/client';
import { GlassButton, GlassPanel } from '../components/Glass';
import { RecognitionRing } from '../components/RecognitionRing';
import { useCamera } from '../hooks/useCamera';
import { prepareImageForClassify, type CapturedPhoto } from '../lib/image-prep';
import { useAppState } from '../state/AppState';
import { dark } from '../theme/dark';

export function CameraScreen({ locale, onClose, onClassified }: {
  locale: Locale;
  onClose: () => void;
  onClassified: (result: ClassifyResult, imageUri: string) => void;
}) {
  const camera = useCamera();
  const { readGrantedLocation } = useAppState();
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [state, setState] = useState<'viewfinder' | 'recognizing' | 'error'>('viewfinder');
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const start = useRef(camera.start);
  start.current = camera.start;

  useEffect(() => {
    void start.current().catch((failure) => {
      setError(getFriendlyError(failure instanceof Error ? failure.message : String(failure), locale));
    });
    return () => { request.current?.abort(); };
  }, [locale]);

  const cancel = () => {
    request.current?.abort();
    request.current = null;
    setPhoto(null);
    setError(null);
    setState('viewfinder');
  };

  const recognize = async (captured: CapturedPhoto) => {
    const controller = new AbortController();
    request.current = controller;
    setState('recognizing');
    setError(null);
    void readGrantedLocation();
    try {
      const image = await prepareImageForClassify(captured);
      if (controller.signal.aborted) return;
      const result = await classifyItem({ image, locale }, controller.signal);
      if (!controller.signal.aborted) onClassified(result, captured.uri);
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(failure instanceof ApiError ? getFriendlyApiError(failure.code, locale)
          : getFriendlyError(failure instanceof Error ? failure.message : String(failure), locale));
        setState('error');
      }
    }
  };

  const capture = async () => {
    const captured = await camera.capture();
    if (!captured) {
      setError(getFriendlyError('Classification failed', locale));
      return;
    }
    setPhoto(captured);
    void recognize(captured);
  };

  return (
    <View style={styles.root}>
      {camera.active && camera.permission?.granted && !photo ?
        <CameraView ref={camera.cameraRef} style={StyleSheet.absoluteFill} facing="back" mode="picture" /> : null}
      {photo ? <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      <View style={[styles.close, { top: insets.top + 12 }]}>
        <GlassButton label={t(locale, state === 'recognizing' ? 'camera.cancel' : 'map.close')}
          onPress={state === 'recognizing' ? cancel : onClose}>
          <Text style={styles.closeIcon}>×</Text>
        </GlassButton>
      </View>
      {camera.status === 'denied' && !photo ? (
        <GlassPanel style={styles.permission}>
          <Text style={styles.body}>{t(locale, 'home.cameraDenied')}</Text>
          <Text style={styles.body}>{t(locale, 'camera.deniedHint')}</Text>
        </GlassPanel>
      ) : null}
      {error && state !== 'recognizing' ? (
        <GlassPanel style={[styles.failure, { bottom: insets.bottom + 112 }]}>
          <Text style={styles.body} accessibilityRole="alert">{error}</Text>
          {photo ? <>
            <GlassButton label={t(locale, 'shared.tryAgain')} onPress={() => void recognize(photo)}>
              <Text style={styles.action}>{t(locale, 'shared.tryAgain')}</Text>
            </GlassButton>
            <GlassButton label={t(locale, 'camera.backToCamera')} onPress={cancel}>
              <Text style={styles.body}>{t(locale, 'camera.backToCamera')}</Text>
            </GlassButton>
          </> : null}
        </GlassPanel>
      ) : null}
      <View style={[styles.shutterRow, { bottom: insets.bottom + 24 }]}>
        {state === 'recognizing' ? <RecognitionRing locale={locale} /> : state === 'viewfinder' && camera.active && camera.permission?.granted ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'camera.capture')}
            disabled={camera.busy} onPress={() => void capture()} style={styles.shutter}>
            <View style={styles.shutterInner} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  close: { position: 'absolute', left: 16 },
  closeIcon: { color: dark.text, fontSize: 32, lineHeight: 36 },
  permission: { position: 'absolute', left: 20, right: 20, top: '35%', padding: 20, gap: 12 },
  failure: { position: 'absolute', left: 16, right: 16, padding: 20, gap: 12 },
  body: { color: dark.text, fontSize: 16, lineHeight: 23 },
  action: { color: dark.accent, fontSize: 16, fontWeight: '700' },
  shutterRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: dark.text,
    alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: dark.text },
});
