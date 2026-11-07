import { useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator, Animated, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getFriendlyApiError, getFriendlyError, getResultShareText, formatDistance, isSingaporeCoordinates,
  LOW_CONFIDENCE_THRESHOLD, t, type ClassifyResult, type Locale, type NearbyPoint, type TranslationKey,
} from '@binwhere/core';
import { ApiError } from '../api/client';
import { GlassPanel } from '../components/Glass';
import { automaticDestination, destinationLayers, findDestination, optionalDestination, type DestinationQuery } from '../lib/destination';
import { reportError } from '../lib/reporting';
import { destinationCamera, islandCamera } from '../map/camera';
import { emptyMapData } from '../map/MapLayers';
import { useSharedMap } from '../map/SharedMap';
import { useAppState } from '../state/AppState';
import { dark } from '../theme/dark';
import type { UserLocation } from '../hooks/useGeolocation';

type DestinationState =
  | { kind: 'idle' | 'loading' }
  | { kind: 'found'; point: NearbyPoint; user: UserLocation }
  | { kind: 'notice'; message: TranslationKey }
  | { kind: 'failed'; message: string };

export function AnswerScreen({ result, locale, photo, onClose, onScanAgain }: {
  result: ClassifyResult;
  locale: Locale;
  photo: string | null;
  onClose: () => void;
  onScanAgain: () => void;
}) {
  const { requestLocation } = useAppState();
  const { ready, reduceMotion, width, height, move, setDestination, setAnswerLayers } = useSharedMap();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState<DestinationQuery | null>(() => automaticDestination(result));
  const [retry, setRetry] = useState(0);
  const [destination, setDestinationState] = useState<DestinationState>({ kind: 'idle' });
  const [photoHidden, setPhotoHidden] = useState(false);
  const [framing, setFraming] = useState<{ destination: DestinationState; height: number } | null>(null);
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const photoScale = useRef(new Animated.Value(1)).current;
  const photoOpacity = useRef(new Animated.Value(1)).current;
  const optional = optionalDestination(result);
  const action = result.next_action;
  const channel = result.channel;
  const headline = action?.title ?? (channel ? t(locale, `instruction.${channel}` as TranslationKey) : result.reason);

  useEffect(() => () => {
    setDestination(emptyMapData);
    setAnswerLayers(null);
  }, [setDestination, setAnswerLayers]);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setAnswerLayers(destinationLayers(query));
    setDestination(emptyMapData);
    setDestinationState({ kind: 'loading' });
    void (async () => {
      try {
        const located = await requestLocation();
        if (cancelled) return;
        if (!located.location) {
          setDestinationState({ kind: 'notice', message: located.error === 'permission_denied'
            ? 'map.locationDenied' : 'map.locationUnavailable' });
          return;
        }
        const user = located.location;
        if (!isSingaporeCoordinates(user.lat, user.lng)) {
          setDestinationState({ kind: 'notice', message: 'map.locationOutsideSingapore' });
          return;
        }
        const point = await findDestination(query, user);
        if (!cancelled) setDestinationState(point ? { kind: 'found', point, user }
          : { kind: 'notice', message: 'nearby.noPoints' });
      } catch (error) {
        if (!cancelled) setDestinationState({ kind: 'failed', message: error instanceof ApiError
          ? getFriendlyApiError(error.code, locale)
          : getFriendlyError(error instanceof Error ? error.message : String(error), locale) });
      }
    })();
    return () => { cancelled = true; };
  }, [query, retry, locale, requestLocation, setAnswerLayers, setDestination]);

  useLayoutEffect(() => {
    if (destination.kind === 'idle' || destination.kind === 'loading') return;
    cardRef.current!.measure((_x, _y, _width, cardHeight) => setFraming({ destination, height: cardHeight }));
  }, [destination]);

  useEffect(() => {
    if (!ready || framing?.destination !== destination || destination.kind === 'idle' || destination.kind === 'loading') return;
    let cancelled = false;
    const island = islandCamera(width, height);
    const target = destination.kind === 'found' ? destinationCamera(
      [destination.point.lng, destination.point.lat], [destination.user.lng, destination.user.lat],
      width, height, framing.height + insets.bottom + 12, insets.top,
    ) : island;
    if (destination.kind === 'found') setDestination({ type: 'FeatureCollection', features: [{
      type: 'Feature', geometry: { type: 'Point', coordinates: [destination.point.lng, destination.point.lat] },
      properties: { label: destination.point.name },
    }] });
    void (async () => {
      if (photo && !photoHidden && !reduceMotion) {
        await move(island, 0);
        if (cancelled) return;
        await new Promise<void>((resolve) => Animated.parallel([
          Animated.timing(photoScale, { toValue: 0.25, duration: 700, useNativeDriver: true }),
          Animated.timing(photoOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]).start(() => resolve()));
        if (cancelled) return;
        setPhotoHidden(true);
      } else if (photo) {
        setPhotoHidden(true);
      }
      if (!cancelled) await move(target, destination.kind === 'found' ? 3000 : 1000);
    })().catch((error) => reportError(error, { operation: 'answer-map-camera' }));
    return () => { cancelled = true; photoScale.stopAnimation(); photoOpacity.stopAnimation(); };
  }, [destination, ready, framing, reduceMotion, width, height, insets.top, insets.bottom,
    move, photo, photoOpacity, photoScale, setDestination]);

  const share = () => {
    void Share.share({ message: getResultShareText(result, locale) }).catch(reportError);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {photo && !photoHidden ? <Animated.Image source={{ uri: photo }} resizeMode="cover" style={[
        StyleSheet.absoluteFill, { opacity: photoOpacity, transform: [{ scale: photoScale }] },
      ]} /> : null}
      <View style={[styles.card, { bottom: Math.max(insets.bottom, 12), maxHeight: height - insets.top - 24 }]} pointerEvents="box-none">
        <GlassPanel>
          <View ref={cardRef} collapsable={false}>
            <ScrollView style={{ maxHeight: height * (expanded ? 0.68 : 0.48) }} contentContainerStyle={styles.content}>
              <Pressable accessibilityRole="button" accessibilityLabel={t(locale, expanded ? 'answer.collapse' : 'answer.expand')}
                accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.header}>
                <View style={styles.handle} />
                <Text style={styles.tag}>{channel ? t(locale, `channel.${channel}` as TranslationKey)
                  : t(locale, `status.${result.status}` as TranslationKey)}</Text>
                <Text style={styles.item}>{result.item}</Text>
                <Text style={styles.headline}>{headline}</Text>
              </Pressable>
              {channel === 'bulky_waste' && destination.kind !== 'idle' ?
                <Text style={styles.name}>{t(locale, 'result.considerDonating')}</Text> : null}
              {destination.kind === 'found' ? <View style={styles.target}>
                <Text style={styles.name}>{destination.point.name}</Text>
                <Text style={styles.distance}>{t(locale, 'map.straightLine')} · {formatDistance(destination.point.distanceKm)}</Text>
                {destination.point.address ? <Text style={styles.body}>{destination.point.address}</Text> : null}
                {destination.point.openingHours ? <Text style={styles.caption}>{t(locale, 'bcrs.openingHours')}: {destination.point.openingHours}</Text> : null}
              </View> : destination.kind === 'loading' ? <ActivityIndicator color={dark.accent}
                accessibilityLabel={t(locale, 'result.gettingLocation')} />
                : destination.kind === 'notice' ? <Text style={styles.body}>{t(locale, destination.message)}</Text>
                : destination.kind === 'failed' ? <View style={styles.section}>
                  <Text style={styles.body}>{destination.message}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'shared.tryAgain')}
                    onPress={() => setRetry((value) => value + 1)} style={styles.button}>
                    <Text style={styles.accent}>{t(locale, 'shared.tryAgain')}</Text>
                  </Pressable>
                </View> : null}
              {optional && !query ? <Pressable accessibilityRole="button"
                accessibilityLabel={t(locale, optional.channel === 'blue_bin' ? 'answer.nearbyBlueBins' : 'bcrs.findNearby')}
                onPress={() => setQuery(optional)} style={styles.button}>
                <Text style={styles.accent}>{t(locale, optional.channel === 'blue_bin' ? 'answer.nearbyBlueBins' : 'bcrs.findNearby')}</Text>
              </Pressable> : null}
              {expanded ? <>
                {action ? <View style={styles.section}>
                  <Text style={styles.body}>{action.instruction}</Text>
                  <Text style={styles.body}>{action.qualification}</Text>
                </View> : <>
                  {result.confidence < LOW_CONFIDENCE_THRESHOLD ? <Text style={styles.caption}>{t(locale, 'result.lowConfidence')}</Text> : null}
                  {result.reason ? <Text style={styles.body}>{result.reason}</Text> : null}
                  {channel ? <View style={styles.section}>
                    <Text style={styles.name}>{t(locale, `channel.${channel}` as TranslationKey)}</Text>
                    <Text style={styles.body}>{t(locale, `instruction.${channel}` as TranslationKey)}</Text>
                  </View> : null}
                  {channel !== 'return_point' && result.preparation?.length ? <View style={styles.section}>
                    <Text style={styles.name}>{t(locale, 'result.beforeYouGo')}</Text>
                    {result.preparation.map((step, index) => <Text key={index} style={styles.body}>{index + 1}. {step}</Text>)}
                  </View> : null}
                  {channel !== 'return_point' && result.tip ? <Text style={styles.body}>{t(locale, 'result.tip')}{result.tip}</Text> : null}
                </>}
                {channel === 'return_point' ? <View style={styles.section}>
                  <Text style={styles.name}>{t(locale, 'bcrs.title')}</Text>
                  <Text style={styles.accent}>{t(locale, 'bcrs.refundAmount')}</Text>
                  {(['bcrs.step1', 'bcrs.step2', 'bcrs.step3', 'bcrs.step4'] as const).map((key, index) =>
                    <Text key={key} style={styles.body}>{index + 1}. {t(locale, key)}</Text>)}
                  <Text style={styles.body}>{t(locale, 'bcrs.eligible')}</Text>
                  <Text style={styles.body}>{t(locale, 'bcrs.excluded')}</Text>
                  <Text style={styles.body}>{t(locale, 'bcrs.pointCount')}</Text>
                </View> : null}
                {channel === 'hazardous' ? <View style={styles.section}>
                  <Text style={styles.name}>{t(locale, 'hazardous.title')}</Text>
                  <Pressable accessibilityRole="link" accessibilityLabel={t(locale, 'hazardous.hotline')}
                    onPress={() => void Linking.openURL('tel:+6562255632').catch(reportError)} style={styles.button}>
                    <Text style={styles.accent}>{t(locale, 'hazardous.hotline')}</Text>
                  </Pressable>
                  <Text style={styles.body}>{t(locale, 'hazardous.hotlineHint')}</Text>
                </View> : null}
                <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'result.share')} onPress={share} style={styles.button}>
                  <Text style={styles.accent}>{t(locale, 'result.share')}</Text>
                </Pressable>
              </> : null}
            </ScrollView>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'map.close')} onPress={onClose} style={styles.close}>
                <Text style={styles.body}>{t(locale, 'map.close')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'result.scanAnother')}
                onPress={onScanAgain} style={styles.scan}>
                <Text style={styles.scanText}>{t(locale, 'result.scanAnother')}</Text>
              </Pressable>
            </View>
          </View>
        </GlassPanel>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', left: 12, right: 12 },
  content: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  header: { paddingTop: 12, gap: 8, minHeight: 52 },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: dark.muted, alignSelf: 'center', marginBottom: 4 },
  tag: { color: dark.accent, fontSize: 14, fontWeight: '700' },
  item: { color: dark.text, fontSize: 26, fontWeight: '700' },
  headline: { color: dark.text, fontSize: 18, lineHeight: 25, fontWeight: '600' },
  body: { color: dark.text, fontSize: 16, lineHeight: 23 },
  name: { color: dark.text, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  caption: { color: dark.muted, fontSize: 14, lineHeight: 20 },
  accent: { color: dark.accent, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  target: { borderTopWidth: 1, borderColor: dark.glassBorder, paddingTop: 12, gap: 6 },
  distance: { color: dark.accent, fontSize: 14, fontWeight: '600' },
  section: { borderTopWidth: 1, borderColor: dark.glassBorder, paddingTop: 12, gap: 8 },
  button: { minHeight: 52, justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  close: { minHeight: 52, paddingHorizontal: 12, justifyContent: 'center' },
  scan: { minHeight: 52, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 18, padding: 12, backgroundColor: dark.accent },
  scanText: { color: dark.onAccent, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
