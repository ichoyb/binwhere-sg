import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CameraView } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFriendlyError, t, type ClassifyResult, type Locale } from '@binwhere/core';
import { classifyItem } from '../api/client';
import { getMobileError } from '../lib/api-error';
import { GlassButton, GlassPanel } from '../components/Glass';
import { RecognitionRing } from '../components/RecognitionRing';
import { useCamera } from '../hooks/useCamera';
import { prepareImageForClassify, type CapturedPhoto } from '../lib/image-prep';
import { reportError } from '../lib/reporting';
import { useAppState } from '../state/AppState';
import { dark } from '../theme/dark';
import { announce } from '../lib/accessibility';

export function CameraScreen({ locale, onClose, onClassified }: {
  locale: Locale;
  onClose: () => void;
  onClassified: (result: ClassifyResult, imageUri: string) => void;
}) {
  const camera = useCamera();
  const { readGrantedLocation } = useAppState();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [state, setState] = useState<'viewfinder' | 'recognizing' | 'error'>('viewfinder');
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const start = useRef(camera.start);
  start.current = camera.start;

  useEffect(() => { if (error) announce(error); }, [error]);
  useEffect(() => {
    if (camera.status === 'denied') announce(`${t(locale, 'home.cameraDenied')}, ${t(locale, 'camera.deniedHint')}`);
  }, [camera.status, locale]);

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
        setError(getMobileError(failure, locale));
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

  const choosePhoto = async () => {
    try {
      const selected = await launchImageLibraryAsync({
        mediaTypes: ['images'], allowsMultipleSelection: false, allowsEditing: false,
      });
      if (selected.canceled) { cancel(); return; }
      const asset = selected.assets[0];
      setPhoto(asset);
      void recognize(asset);
    } catch (failure) {
      setError(getMobileError(failure, locale));
    }
  };

  return (
    <View style={styles.root} accessibilityViewIsModal onAccessibilityEscape={state === 'recognizing' ? cancel : onClose}>
      {camera.active && camera.permission?.granted && !photo ?
        <CameraView ref={camera.cameraRef} style={StyleSheet.absoluteFill} facing="back" mode="picture"
          accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /> : null}
      {photo ? <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover"
        accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /> : null}
      <View style={[styles.close, { top: insets.top + 12 }]}>
        <GlassButton label={t(locale, state === 'recognizing' ? 'camera.cancel' : 'map.close')}
          onPress={state === 'recognizing' ? cancel : onClose}>
          <Text style={styles.closeIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">×</Text>
        </GlassButton>
      </View>
      {camera.status === 'denied' && !photo ? (
        <GlassPanel style={[styles.permission, { maxHeight: height * 0.65 - insets.bottom - 112 }]}>
          <ScrollView alwaysBounceVertical={false} contentContainerStyle={styles.messageContent}>
          <Text style={styles.body}>{t(locale, 'home.cameraDenied')}</Text>
          <Text style={styles.body}>{t(locale, 'camera.deniedHint')}</Text>
          <GlassButton label={t(locale, 'camera.openSettings')}
            onPress={() => void Linking.openSettings().catch((failure) => reportError(failure, { operation: 'open-camera-settings' }))}>
            <Text style={styles.action}>{t(locale, 'camera.openSettings')}</Text>
          </GlassButton>
          </ScrollView>
        </GlassPanel>
      ) : null}
      {error && state !== 'recognizing' ? (
        <GlassPanel style={[styles.failure, { bottom: insets.bottom + 112, maxHeight: height - insets.top - insets.bottom - 188 }]}>
          <ScrollView alwaysBounceVertical={false} contentContainerStyle={styles.messageContent}>
          <Text style={styles.body}>{error}</Text>
          {photo ? <>
            <GlassButton label={t(locale, 'shared.tryAgain')} onPress={() => void recognize(photo)}>
              <Text style={styles.action}>{t(locale, 'shared.tryAgain')}</Text>
            </GlassButton>
            <GlassButton label={t(locale, 'camera.backToCamera')} onPress={cancel}>
              <Text style={styles.body}>{t(locale, 'camera.backToCamera')}</Text>
            </GlassButton>
          </> : null}
          </ScrollView>
        </GlassPanel>
      ) : null}
      <View style={[styles.shutterRow, { bottom: insets.bottom + 24 }]}>
        {!photo ? <View style={styles.library}>
          <GlassButton label={t(locale, 'camera.library')} onPress={() => void choosePhoto()}>
            <View style={styles.photoIcon} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <View style={styles.sun} /><View style={styles.mountain} />
            </View>
          </GlassButton>
        </View> : null}
        {state === 'recognizing' ? <RecognitionRing locale={locale} /> : state === 'viewfinder' && camera.active && camera.permission?.granted ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'camera.capture')}
            disabled={camera.busy} accessibilityState={{ disabled: camera.busy, busy: camera.busy }}
            onPress={() => void capture()} style={styles.shutter}>
            <View style={styles.shutterInner} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
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
  permission: { position: 'absolute', left: 20, right: 20, top: '35%' },
  failure: { position: 'absolute', left: 16, right: 16 },
  messageContent: { padding: 20, gap: 12 },
  body: { color: dark.text, fontSize: 16, lineHeight: 23 },
  action: { color: dark.accent, fontSize: 16, fontWeight: '700' },
  shutterRow: { position: 'absolute', left: 0, right: 0, minHeight: 72, justifyContent: 'center', alignItems: 'center' },
  library: { position: 'absolute', left: 24 },
  photoIcon: { width: 26, height: 24, borderWidth: 2, borderColor: dark.text, borderRadius: 4, overflow: 'hidden' },
  sun: { position: 'absolute', width: 5, height: 5, borderRadius: 3, top: 3, right: 3, backgroundColor: dark.text },
  mountain: { position: 'absolute', width: 18, height: 18, left: 1, top: 12,
    borderWidth: 2, borderColor: dark.text, transform: [{ rotate: '45deg' }] },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: dark.text,
    alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: dark.text },
});
