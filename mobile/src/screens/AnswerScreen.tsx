import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator, Animated, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getResultShareText, getResultTitleKey, requiresEwasteCollection, ALBA_COLLECTION_URL,
  LOW_CONFIDENCE_THRESHOLD, t, type ClassifyResult, type Locale, type NearbyPoint, type TranslationKey,
} from '@binwhere/core';
import { GlassPanel } from '../components/Glass';
import { AreaPicker } from '../components/AreaPicker';
import { AreaControls, LocationFailureActions } from '../components/LocationControls';
import { WalkingRouteDetails } from '../components/WalkingRouteDetails';
import { useWalkingRoute } from '../hooks/useWalkingRoute';
import { routeMapData } from '../map/route-data';
import { answerInitiallyExpanded, automaticDestination, destinationLayers, findDestination, optionalDestination, type DestinationQuery } from '../lib/destination';
import { openLink } from '../lib/open-link';
import { reportError } from '../lib/reporting';
import { destinationCamera, islandCamera } from '../map/camera';
import { emptyMapData } from '../map/MapLayers';
import { useSharedMap } from '../map/SharedMap';
import { useAppState } from '../state/AppState';
import { dark } from '../theme/dark';
import type { UserLocation } from '../hooks/useGeolocation';
import { getMobileError } from '../lib/api-error';
import { locationFailureNotice, sameLocationSelection, type LocationFailure } from '../lib/location-source';
import { announce, focusAccessibility } from '../lib/accessibility';
import { answerHeaderLabel, destinationAnnouncement } from '../lib/accessibility-text';

type DestinationState =
  | { kind: 'idle' | 'loading' }
  | { kind: 'found'; point: NearbyPoint; user: UserLocation }
  | { kind: 'notice'; message: TranslationKey; reason?: LocationFailure }
  | { kind: 'failed'; message: string };

export function AnswerScreen({ result, locale, photo, onClose, onScanAgain }: {
  result: ClassifyResult;
  locale: Locale;
  photo: string | null;
  onClose: () => void;
  onScanAgain: () => void;
}) {
  const { resolveLocation, locationSelection, getLocationSelection, locationPermission,
    selectArea, useDeviceLocation } = useAppState();
  const [choosingArea, setChoosingArea] = useState(false);
  const finding = useRef(false);
  const nearbyRequest = useRef<AbortController | null>(null);
  const { ready, reduceMotion, width, height, move, moveAndWait, setDestination, setRoute, setDistance, setAnswerLayers } = useSharedMap();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const [expanded, setExpanded] = useState(() => answerInitiallyExpanded(result));
  const [query, setQuery] = useState<DestinationQuery | null>(() => automaticDestination(result));
  const [retry, setRetry] = useState(0);
  const [destination, setDestinationState] = useState<DestinationState>({ kind: 'idle' });
  const [landed, setLanded] = useState<DestinationState | null>(null);
  const routeTarget = useMemo(() => destination.kind === 'found'
    ? { origin: destination.user, destination: { lat: destination.point.lat, lng: destination.point.lng } }
    : null, [destination]);
  const walking = useWalkingRoute(routeTarget);
  const [photoHidden, setPhotoHidden] = useState(false);
  const [framing, setFraming] = useState<{ destination: DestinationState; height: number } | null>(null);
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const headerRef = useRef<ComponentRef<typeof View>>(null);
  const areaTrigger = useRef<ComponentRef<typeof View> | null>(null);
  const areaSelected = useRef(false);
  const framedHeight = useRef(0);
  const photoScale = useRef(new Animated.Value(1)).current;
  const photoOpacity = useRef(new Animated.Value(1)).current;
  const optional = optionalDestination(result);
  const action = result.next_action;
  const channel = result.channel;
  const titleKey = getResultTitleKey(result);
  const headline = action?.title ?? (titleKey ? t(locale, titleKey) : result.reason);
  const collection = requiresEwasteCollection(result);

  useEffect(() => {
    const frame = requestAnimationFrame(() => focusAccessibility(headerRef.current));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (destination.kind === 'found') announce(destinationAnnouncement(destination.point.name, destination.point.distanceKm, locale));
    if (destination.kind === 'notice') announce(t(locale, destination.message));
    if (destination.kind === 'failed') announce(destination.message);
  }, [destination, locale]);

  useEffect(() => () => {
    setDestination(emptyMapData);
    setRoute(emptyMapData);
    setDistance(emptyMapData);
    setAnswerLayers(null);
  }, [setDestination, setRoute, setDistance, setAnswerLayers]);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const source = getLocationSelection();
    const controller = new AbortController();
    nearbyRequest.current = controller;
    const current = () => !cancelled && sameLocationSelection(source, getLocationSelection());
    finding.current = true;
    setAnswerLayers(destinationLayers(query));
    setDestination(emptyMapData);
    setRoute(emptyMapData);
    setDistance(emptyMapData);
    setLanded(null);
    setDestinationState({ kind: 'loading' });
    void (async () => {
      try {
        const located = await resolveLocation();
        if (!current()) return;
        if (located.kind === 'failed') {
          setDestinationState({ kind: 'notice', message: locationFailureNotice(located.reason).message, reason: located.reason });
          return;
        }
        const user = located.location;
        const point = await findDestination(query, user, controller.signal);
        if (current()) setDestinationState(point ? { kind: 'found', point, user }
          : { kind: 'notice', message: 'nearby.noPoints' });
      } catch (error) {
        if (current()) setDestinationState({ kind: 'failed', message: getMobileError(error, locale) });
      } finally {
        if (current()) finding.current = false;
      }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [query, retry, locale, resolveLocation, locationSelection, getLocationSelection,
    setAnswerLayers, setDestination, setRoute, setDistance]);

  useEffect(() => {
    if (destination.kind === 'notice' && destination.reason === 'denied'
      && locationPermission?.granted && !finding.current) setRetry((value) => value + 1);
  }, [destination, locationPermission?.granted]);

  useEffect(() => {
    const data = landed === destination && walking.route.kind === 'success'
      ? routeMapData(walking.route.response) : { route: emptyMapData, distance: emptyMapData };
    setRoute(data.route);
    setDistance(data.distance);
  }, [destination, landed, walking.route, setRoute, setDistance]);

  useLayoutEffect(() => {
    if (destination.kind === 'idle' || destination.kind === 'loading') return;
    cardRef.current!.measure((_x, _y, _width, cardHeight) => setFraming({ destination, height: cardHeight }));
  }, [destination]);

  useEffect(() => {
    if (!ready || framing?.destination !== destination || destination.kind === 'idle' || destination.kind === 'loading') return;
    let cancelled = false;
    const source = getLocationSelection();
    const current = () => !cancelled && sameLocationSelection(source, getLocationSelection());
    const island = islandCamera(width, height);
    const target = destination.kind === 'found' ? destinationCamera(
      [destination.point.lng, destination.point.lat], [destination.user.lng, destination.user.lat],
      width, height, framing.height + Math.max(insets.bottom, 12), insets.top,
    ) : island;
    framedHeight.current = framing.height;
    if (destination.kind === 'found') setDestination({ type: 'FeatureCollection', features: [{
      type: 'Feature', geometry: { type: 'Point', coordinates: [destination.point.lng, destination.point.lat] },
      properties: { label: destination.point.name },
    }] });
    void (async () => {
      if (photo && !photoHidden && !reduceMotion) {
        await move(island, 0);
        if (!current()) return;
        await new Promise<void>((resolve) => Animated.parallel([
          Animated.timing(photoScale, { toValue: 0.25, duration: 700, useNativeDriver: true }),
          Animated.timing(photoOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]).start(() => resolve()));
        if (!current()) return;
        setPhotoHidden(true);
      } else if (photo) {
        setPhotoHidden(true);
      }
      if (current()) {
        await moveAndWait(target, destination.kind === 'found' ? 3000 : 1000);
        if (current()) setLanded(destination);
      }
    })().catch((error) => {
      if (current()) reportError(error, { operation: 'answer-map-camera' });
    });
    return () => { cancelled = true; photoScale.stopAnimation(); photoOpacity.stopAnimation(); };
  }, [destination, ready, framing?.destination, reduceMotion, width, height, insets.top, insets.bottom,
    move, moveAndWait, photo, photoOpacity, photoScale, setDestination, getLocationSelection]);

  useEffect(() => {
    if (landed !== destination || destination.kind !== 'found' || framing?.destination !== destination
      || framing.height === framedHeight.current) return;
    framedHeight.current = framing.height;
    const source = getLocationSelection();
    void move(destinationCamera([destination.point.lng, destination.point.lat],
      [destination.user.lng, destination.user.lat], width, height,
      framing.height + Math.max(insets.bottom, 12), insets.top), 400)
      .catch((error) => {
        if (sameLocationSelection(source, getLocationSelection())) reportError(error, { operation: 'answer-card-camera' });
      });
  }, [landed, destination, framing, width, height, insets.bottom, insets.top, move, getLocationSelection]);

  const share = () => {
    void Share.share({ message: getResultShareText(result, locale) }).catch(reportError);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" accessibilityViewIsModal onAccessibilityEscape={onClose}>
      {photo && !photoHidden ? <Animated.Image accessibilityElementsHidden importantForAccessibility="no-hide-descendants" source={{ uri: photo }} resizeMode="cover" style={[
        StyleSheet.absoluteFill, { opacity: photoOpacity, transform: [{ scale: photoScale }] },
      ]} /> : null}
      <View style={[styles.card, { bottom: Math.max(insets.bottom, 12), maxHeight: height - insets.top - 24 }]} pointerEvents="box-none">
        <GlassPanel style={styles.panel}>
          <View ref={cardRef} style={styles.cardBody} collapsable={false} onLayout={(event) => {
            const cardHeight = event.nativeEvent.layout.height;
            setFraming((current) => current?.destination === destination && current.height === cardHeight
              ? current : { destination, height: cardHeight });
          }}>
            <ScrollView style={{ maxHeight: height * (expanded ? 0.68 : 0.48) }} contentContainerStyle={styles.content}>
              <Pressable ref={headerRef} accessible accessibilityRole="button" accessibilityLabel={answerHeaderLabel(result, locale)}
                accessibilityHint={t(locale, expanded ? 'answer.collapse' : 'answer.expand')}
                accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.header}>
                <View style={[styles.chevron, expanded && styles.chevronDown]}
                  importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  <View style={[styles.chevronLine, styles.chevronLeft]} />
                  <View style={[styles.chevronLine, styles.chevronRight]} />
                </View>
                <Text style={styles.tag}>{channel ? t(locale, `channel.${channel}` as TranslationKey)
                  : t(locale, `status.${result.status}` as TranslationKey)}</Text>
                <Text style={styles.item} maxFontSizeMultiplier={2}>{result.item}</Text>
                <Text style={styles.headline}>{headline}</Text>
              </Pressable>
              {channel === 'bulky_waste' && destination.kind !== 'idle' ?
                <Text style={styles.name} accessibilityRole="header">{t(locale, 'result.considerDonating')}</Text> : null}
              {query && locationSelection.locationSource === 'manual' ? <AreaControls
                area={locationSelection.area} locale={locale} onChangeArea={(trigger) => { areaTrigger.current = trigger; setChoosingArea(true); }}
                onUseLocation={() => {
                  nearbyRequest.current?.abort(); walking.cancel();
                  setDestinationState({ kind: 'loading' }); useDeviceLocation();
                }}
                buttonStyle={styles.button} textStyle={styles.accent} labelStyle={styles.body} /> : null}
              {destination.kind === 'found' ? <View style={styles.target}>
                <Text style={styles.name} accessibilityRole="header">{destination.point.name}</Text>
                {locationSelection.locationSource === 'manual' ? <Text style={styles.caption}>
                  {t(locale, 'location.fromArea').replace('{area}', locationSelection.area.names[locale])}</Text> : null}
                <WalkingRouteDetails locale={locale}
                  distanceKm={destination.point.distanceKm} route={walking.route} retry={walking.retry} />
                {destination.point.address ? <Text style={styles.body}>{destination.point.address}</Text> : null}
                {destination.point.openingHours ? <Text style={styles.caption}>{t(locale, 'bcrs.openingHours')}: {destination.point.openingHours}</Text> : null}
              </View> : destination.kind === 'loading' ? <ActivityIndicator color={dark.accent}
                accessibilityLabel={t(locale, 'result.gettingLocation')} />
                : destination.kind === 'notice' ? <View>
                  <Text style={styles.body}>{t(locale, destination.message)}</Text>
                  {destination.reason ? <LocationFailureActions locale={locale} reason={destination.reason}
                    retryKey="shared.tryAgain" onRetry={() => setRetry((value) => value + 1)}
                    onChooseArea={(trigger) => { areaTrigger.current = trigger; setChoosingArea(true); }} buttonStyle={styles.button} textStyle={styles.accent} /> : null}
                </View>
                : destination.kind === 'failed' ? <View style={styles.section}>
                  <Text style={styles.body}>{destination.message}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'shared.tryAgain')}
                    onPress={() => setRetry((value) => value + 1)} style={styles.button}>
                    <Text style={styles.accent}>{t(locale, 'shared.tryAgain')}</Text>
                  </Pressable>
                </View> : null}
              {optional && !query ? <Pressable accessibilityRole="button"
                accessibilityLabel={t(locale, optional.channel === 'blue_bin' ? 'answer.nearbyBlueBins' : 'bcrs.findNearby')}
                onPress={() => { setExpanded(false); setQuery(optional); }} style={styles.button}>
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
                    <Text style={styles.name} accessibilityRole="header">{t(locale, `channel.${channel}` as TranslationKey)}</Text>
                    <Text style={styles.body}>{titleKey ? t(locale, titleKey) : result.reason}</Text>
                  </View> : null}
                  {channel !== 'return_point' && result.preparation?.length ? <View style={styles.section}>
                    <Text style={styles.name} accessibilityRole="header">{t(locale, 'result.beforeYouGo')}</Text>
                    {result.preparation.map((step, index) => <Text key={index} style={styles.body}>{index + 1}. {step}</Text>)}
                  </View> : null}
                  {collection ? <Pressable accessibilityRole="link"
                    accessibilityLabel={t(locale, 'ewaste.collection.book')}
                    onPress={() => void openLink(ALBA_COLLECTION_URL).catch(reportError)}
                    style={[styles.button, fontScale > 1 && styles.collectionLink]}>
                    <Text style={styles.accent}>{t(locale, 'ewaste.collection.book')}</Text>
                  </Pressable> : null}
                  {channel !== 'return_point' && result.tip ? <Text style={styles.body}>{t(locale, 'result.tip')}{result.tip}</Text> : null}
                </>}
                {channel === 'return_point' ? <View style={styles.section}>
                  <Text style={styles.name} accessibilityRole="header">{t(locale, 'bcrs.title')}</Text>
                  <Text style={styles.accent}>{t(locale, 'bcrs.refundAmount')}</Text>
                  {(['bcrs.step1', 'bcrs.step2', 'bcrs.step3', 'bcrs.step4'] as const).map((key, index) =>
                    <Text key={key} style={styles.body}>{index + 1}. {t(locale, key)}</Text>)}
                  <Text style={styles.body}>{t(locale, 'bcrs.eligible')}</Text>
                  <Text style={styles.body}>{t(locale, 'bcrs.excluded')}</Text>
                  <Text style={styles.body}>{t(locale, 'bcrs.pointCount')}</Text>
                </View> : null}
                {channel === 'hazardous' ? <View style={styles.section}>
                  <Text style={styles.name} accessibilityRole="header">{t(locale, 'hazardous.title')}</Text>
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
            <View style={[styles.actions, fontScale > 1 && styles.scaledActions]}>
              <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'map.close')} onPress={onClose} style={[styles.close, fontScale > 1 && styles.scaledAction]}>
                <Text style={styles.body}>{t(locale, 'map.close')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'result.scanAnother')}
                onPress={onScanAgain} style={[styles.scan, fontScale > 1 && styles.scaledAction]}>
                <Text style={styles.scanText}>{t(locale, 'result.scanAnother')}</Text>
              </Pressable>
            </View>
          </View>
        </GlassPanel>
      </View>
      <AreaPicker visible={choosingArea} locale={locale} reduceMotion={reduceMotion} onDismiss={() => {
        focusAccessibility(areaSelected.current ? headerRef.current : areaTrigger.current);
        areaSelected.current = false;
      }} onClose={() => {
        setChoosingArea(false);
      }} onSelect={(area) => {
        areaSelected.current = true;
        nearbyRequest.current?.abort();
        walking.cancel();
        setDestinationState({ kind: 'loading' });
        setDestination(emptyMapData); setRoute(emptyMapData); setDistance(emptyMapData);
        selectArea(area); setChoosingArea(false); setRetry((value) => value + 1);
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  collectionLink: { alignSelf: 'stretch', width: '100%' },
  scaledActions: { flexDirection: 'column' },
  scaledAction: { flex: 0 },
  card: { position: 'absolute', left: 12, right: 12 },
  panel: { flexShrink: 1 },
  cardBody: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  header: { paddingTop: 12, gap: 8, minHeight: 52 },
  chevron: { width: 56, height: 12, alignSelf: 'center', marginBottom: 4 },
  chevronDown: { transform: [{ rotate: '180deg' }] },
  chevronLine: { position: 'absolute', top: 4, width: 29, height: 4, borderRadius: 2, backgroundColor: dark.muted },
  chevronLeft: { left: 0, transform: [{ rotate: '-16deg' }] },
  chevronRight: { right: 0, transform: [{ rotate: '16deg' }] },
  tag: { color: dark.accent, fontSize: 14, fontWeight: '700' },
  item: { color: dark.text, fontSize: 26, fontWeight: '700' },
  headline: { color: dark.text, fontSize: 18, lineHeight: 25, fontWeight: '600' },
  body: { color: dark.text, fontSize: 16, lineHeight: 23 },
  name: { color: dark.text, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  caption: { color: dark.muted, fontSize: 14, lineHeight: 20 },
  accent: { color: dark.accent, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  target: { borderTopWidth: 1, borderColor: dark.glassBorder, paddingTop: 12, gap: 6 },
  section: { borderTopWidth: 1, borderColor: dark.glassBorder, paddingTop: 12, gap: 8 },
  button: { minHeight: 52, justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  close: { minHeight: 52, flexShrink: 1, paddingHorizontal: 12, justifyContent: 'center' },
  scan: { minHeight: 52, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 18, padding: 12, backgroundColor: dark.accent },
  scanText: { color: dark.onAccent, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
