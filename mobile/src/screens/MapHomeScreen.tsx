import {
  DATA_LICENSE_URL, ewasteAcceptTranslationKey, isSingaporeCoordinates, t,
  type Locale, type PointsLayer, type RouteRequest, type TranslationKey,
} from '@binwhere/core';
import {
  Camera, Map, type CameraRef, type MapRef, type PressEvent, type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type ComponentRef } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View,
  useWindowDimensions, type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton, GlassPanel } from '../components/Glass';
import { AreaPicker } from '../components/AreaPicker';
import { AreaControls, LocationFailureActions } from '../components/LocationControls';
import { MapIcon } from '../components/MapIcon';
import type { FeatureCollection, LineString } from 'geojson';
import { WalkingRouteDetails } from '../components/WalkingRouteDetails';
import { useWalkingRoute } from '../hooks/useWalkingRoute';
import { usePoints } from '../hooks/usePoints';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { reportError } from '../lib/reporting';
import { openLink } from '../lib/open-link';
import { straightLineKm } from '../lib/straight-line-distance';
import { MapLayers, emptyMapData, type MapLabels } from '../map/MapLayers';
import { cameraCommand, createMapCamera, destinationCamera, islandCamera, type MapCameraTarget } from '../map/camera';
import { pointsToGeoJSON, pointTypes, type MapPoints } from '../map/points';
import { mapStyle, neighborhoodMinZoom, pointColors } from '../map/style';
import { useAppState } from '../state/AppState';
import { dark } from '../theme/dark';
import { SharedMapContext } from '../map/SharedMap';
import { routeMapData } from '../map/route-data';
import { locationFailureNotice, sameLocationSelection, type LocationFailure } from '../lib/location-source';
import { announce, focusAccessibility } from '../lib/accessibility';
import { destinationAnnouncement } from '../lib/accessibility-text';

type LocationOperation = 'locate' | 'route';
type LocationNotice = { kind: 'failed'; reason: LocationFailure; operation: LocationOperation } | { kind: 'area' };

interface Props {
  locale: Locale;
  onSearch: () => void;
  onCamera: () => void;
  onBcrsEntry: () => void;
  homeVisible: boolean;
  attributionAboveChildren: boolean;
  searchOpen: boolean;
  children: ReactNode;
}

export function MapHomeScreen({ locale, onSearch, onCamera, onBcrsEntry, homeVisible, attributionAboveChildren, searchOpen, children }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const initial = useRef(cameraCommand(islandCamera(width, height), 0)).current;
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const searchButton = useRef<ComponentRef<typeof Pressable>>(null);
  const areaTrigger = useRef<ComponentRef<typeof Pressable> | null>(null);
  const areaSelected = useRef(false);
  const areaOperation = useRef<LocationOperation>('locate');
  const [areaFocus, setAreaFocus] = useState<LocationOperation | null>(null);
  const noticeLabel = useRef<ComponentRef<typeof Text>>(null);
  const pointOrigin = useRef<ComponentRef<typeof Text>>(null);
  const wasSearchOpen = useRef(searchOpen);
  const [ready, setReady] = useState(false);
  const [neighborhood, setNeighborhood] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<PointsLayer[]>([...pointTypes]);
  const [selected, setSelected] = useState<MapPoints['features'][number] | null>(null);
  const [attributionExpanded, setAttributionExpanded] = useState(true);
  const [notice, setNotice] = useState<LocationNotice | null>(null);
  const [choosingArea, setChoosingArea] = useState<LocationOperation | null>(null);
  const continueOperation = useRef<LocationOperation | null>(null);
  const [locating, setLocating] = useState(false);
  const [destination, setDestination] = useState<MapLabels>(emptyMapData);
  const [route, setRoute] = useState<FeatureCollection<LineString>>(emptyMapData);
  const [distance, setDistance] = useState<MapLabels>(emptyMapData);
  const [homeRequest, setHomeRequest] = useState<RouteRequest | null>(null);
  const [homeLanded, setHomeLanded] = useState<RouteRequest | null>(null);
  const [controlsHeight, setControlsHeight] = useState(0);
  const [routeLocating, setRouteLocating] = useState(false);
  const locationRequest = useRef(0);
  const cameraSettled = useRef<(() => void) | null>(null);
  const walking = useWalkingRoute(homeRequest);
  const cancelWalkingRoute = walking.cancel;
  const [answerLayers, setAnswerLayers] = useState<PointsLayer[] | null>(null);
  const reduceMotion = useReduceMotion();
  const { location, resolveLocation, locationSelection, getLocationSelection,
    locationPermission, selectArea, useDeviceLocation } = useAppState();
  const { response, failed, loading, refresh } = usePoints();
  const points = useMemo(() => response ? pointsToGeoJSON(response) : emptyMapData, [response]);
  const inSingapore = location !== null && isSingaporeCoordinates(location.lat, location.lng);
  const origin = locationSelection.locationSource === 'manual'
    ? { lat: locationSelection.area.lat, lng: locationSelection.area.lng } : inSingapore ? location : null;
  const user = useMemo<MapLabels>(() => locationSelection.locationSource === 'device' && inSingapore ? {
    type: 'FeatureCollection', features: [{ type: 'Feature',
      geometry: { type: 'Point', coordinates: [location.lng, location.lat] }, properties: { label: '' } }],
  } : emptyMapData, [inSingapore, location, locationSelection]);

  useEffect(() => {
    const returning = wasSearchOpen.current && !searchOpen && homeVisible;
    wasSearchOpen.current = searchOpen;
    if (returning) {
      const frame = requestAnimationFrame(() => focusAccessibility(searchButton.current));
      return () => cancelAnimationFrame(frame);
    }
  }, [searchOpen, homeVisible]);

  useEffect(() => {
    if (notice?.kind === 'failed') announce(t(locale, locationFailureNotice(notice.reason).message));
  }, [notice, locale]);

  useEffect(() => { if (failed) announce(t(locale, 'map.pointsUnavailable')); }, [failed, locale]);

  useEffect(() => {
    if (!areaFocus) return;
    const target = areaFocus === 'route' ? pointOrigin.current : noticeLabel.current;
    if (target) { focusAccessibility(target); setAreaFocus(null); }
  }, [areaFocus, notice, locationSelection, selected]);

  useEffect(() => {
    if (selected) announce(origin
      ? destinationAnnouncement(selected.properties.name, straightLineKm(origin, selected.geometry.coordinates), locale)
      : selected.properties.name);
  }, [selected, locale]);

  useEffect(() => {
    const timer = setTimeout(() => setAttributionExpanded(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const clearHomeRoute = useCallback(() => {
    cancelWalkingRoute();
    locationRequest.current++;
    setLocating(false);
    setRouteLocating(false);
    setHomeRequest(null);
    setHomeLanded(null);
    setRoute(emptyMapData);
    setDistance(emptyMapData);
    setDestination(emptyMapData);
  }, [cancelWalkingRoute]);

  useEffect(() => {
    setSelected(null);
    if (homeVisible) clearHomeRoute();
  }, [points, homeVisible, clearHomeRoute]);
  useEffect(() => {
    if (!homeVisible) { setSelected(null); clearHomeRoute(); }
  }, [homeVisible, clearHomeRoute]);

  const move = useCallback(async (target: MapCameraTarget, durationMs = 1000) => {
    const camera = createMapCamera(mapRef.current!, cameraRef.current!);
    if (reduceMotion) await camera.jumpTo(target);
    else await camera.flyTo(target, durationMs);
  }, [reduceMotion]);

  const moveAndWait = useCallback(async (target: MapCameraTarget, durationMs = 1000) => {
    cameraSettled.current?.();
    await move(target, durationMs);
    await new Promise<void>((resolve) => { cameraSettled.current = resolve; });
  }, [move]);

  useEffect(() => {
    if (!homeRequest || !controlsHeight || !ready) return;
    let cancelled = false;
    const source = getLocationSelection();
    const { origin, destination: target } = homeRequest;
    setDestination({ type: 'FeatureCollection', features: [{ type: 'Feature',
      geometry: { type: 'Point', coordinates: [target.lng, target.lat] },
      properties: { label: selected!.properties.name } }] });
    void moveAndWait(destinationCamera([target.lng, target.lat], [origin.lng, origin.lat],
      width, height, controlsHeight + Math.max(insets.bottom, dark.gap), insets.top)).then(() => {
      if (!cancelled && sameLocationSelection(source, getLocationSelection())) setHomeLanded(homeRequest);
    }).catch((error) => {
      if (!cancelled && sameLocationSelection(source, getLocationSelection())) reportError(error, { operation: 'point-route-camera' });
    });
    return () => { cancelled = true; };
  }, [homeRequest, controlsHeight, ready, width, height, insets.bottom, insets.top, moveAndWait, getLocationSelection]);

  useEffect(() => {
    const data = homeRequest && homeLanded === homeRequest && walking.route.kind === 'success'
      ? routeMapData(walking.route.response) : { route: emptyMapData, distance: emptyMapData };
    if (homeRequest) { setRoute(data.route); setDistance(data.distance); }
  }, [homeRequest, homeLanded, walking.route]);

  const requestPointRoute = async () => {
    clearHomeRoute();
    const active = locationRequest.current;
    const source = getLocationSelection();
    const point = selected!;
    setRouteLocating(true);
    setNotice((current) => current?.kind === 'area' ? current : null);
    const located = await resolveLocation();
    if (active !== locationRequest.current || !sameLocationSelection(source, getLocationSelection())) return;
    setRouteLocating(false);
    if (located.kind === 'failed') {
      setNotice({ kind: 'failed', reason: located.reason, operation: 'route' });
    } else {
      setHomeRequest({ origin: located.location,
        destination: { lng: point.geometry.coordinates[0], lat: point.geometry.coordinates[1] } });
    }
  };

  const locate = async () => {
    clearHomeRoute();
    const active = locationRequest.current;
    const source = getLocationSelection();
    const current = () => active === locationRequest.current && sameLocationSelection(source, getLocationSelection());
    setLocating(true);
    setNotice(null);
    setLayersOpen(false);
    try {
      const result = await resolveLocation();
      if (!current()) return;
      if (result.kind === 'failed') {
        setNotice({ kind: 'failed', reason: result.reason, operation: 'locate' });
      } else {
        const next = result.location;
        await move({ center: [next.lng, next.lat], zoom: 16, pitch: 25, bearing: 0 });
        if (current() && result.kind === 'manual') setNotice({ kind: 'area' });
      }
    } catch (error) {
      if (current()) {
        setNotice({ kind: 'failed', reason: 'unavailable', operation: 'locate' });
        reportError(error, { operation: 'map-locate' });
      }
    } finally {
      if (current()) setLocating(false);
    }
  };

  useLayoutEffect(() => {
    clearHomeRoute();
    setNotice(null);
    const operation = continueOperation.current;
    continueOperation.current = null;
    if (operation === 'route') void requestPointRoute();
    if (operation === 'locate') void locate();
  }, [locationSelection]);

  useEffect(() => {
    if (locationPermission?.granted) {
      setNotice((current) => current?.kind === 'failed' && current.reason === 'denied' ? null : current);
    }
  }, [locationPermission?.granted]);

  const pressMap = async ({ nativeEvent }: NativeSyntheticEvent<PressEvent>) => {
    const areaNotice = notice?.kind === 'area' ? notice : null;
    clearHomeRoute();
    setSelected(null);
    setNotice(null);
    setLayersOpen(false);
    const map = mapRef.current!;
    const current = await createMapCamera(map, cameraRef.current!).read();
    if (current.zoom < neighborhoodMinZoom) {
      await move({ ...current, center: nativeEvent.lngLat,
        zoom: Math.min(current.zoom + 2, neighborhoodMinZoom) });
      return;
    }
    const [x, y] = nativeEvent.point;
    const features = await map.queryRenderedFeatures([[x - 14, y - 14], [x + 14, y + 14]], { layers: ['point-core'] });
    if (features.length > 0) {
      const point = points.features.find((feature) => String(feature.id) === String(features[0].id));
      if (point) { setSelected(point); setNotice(areaNotice); }
    }
  };

  const cameraChanged = ({ nativeEvent }: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    setNeighborhood(nativeEvent.zoom >= neighborhoodMinZoom);
    if (nativeEvent.userInteraction) {
      setAttributionExpanded(false);
      if (homeVisible && walking.route.kind !== 'success') { setSelected(null); clearHomeRoute(); }
    }
  };
  const label = (type: PointsLayer) => type === 'return_point' ? 'BCRS'
    : t(locale, `channel.${type}` as TranslationKey);
  const openLicense = () => {
    void openLink(DATA_LICENSE_URL).catch((error) => reportError(error, { operation: 'open-data-license' }));
  };
  const overlayAttribution = !homeVisible ? <View style={[styles.overlayAttribution, { top: insets.top + 12 }]}>
    <Pressable accessibilityLabel={`${t(locale, 'map.dataLicense')}${attributionExpanded ? ', © OpenStreetMap' : ''}`} accessibilityRole="link"
      onPress={openLicense} style={styles.attribution} hitSlop={14}>
      <Text style={styles.caption} maxFontSizeMultiplier={2}>{attributionExpanded ? '© OpenStreetMap' : 'ⓘ'}</Text>
    </Pressable>
  </View> : null;

  const bottomContent = (
    <>
      <View style={styles.attributionRow} pointerEvents="box-none">
        <Pressable accessibilityLabel={`${t(locale, 'map.dataLicense')}${attributionExpanded ? ', © OpenStreetMap' : ''}`} accessibilityRole="link"
          onPress={openLicense} style={styles.attribution} hitSlop={14}>
          <Text style={styles.caption} maxFontSizeMultiplier={2}>{attributionExpanded ? '© OpenStreetMap' : 'ⓘ'}</Text>
        </Pressable>
      </View>
      {notice ? (
        <GlassPanel style={styles.notice}>
          {notice.kind === 'failed' ? <>
            <Text style={styles.body}>{t(locale, locationFailureNotice(notice.reason).message)}</Text>
            <LocationFailureActions locale={locale} reason={notice.reason} retryKey="map.retry"
              onRetry={() => { if (notice.operation === 'route') void requestPointRoute(); else void locate(); }}
              onChooseArea={(trigger) => { areaTrigger.current = trigger; setChoosingArea(notice.operation); }} buttonStyle={styles.dismiss} textStyle={styles.retry} />
          </> : locationSelection.locationSource === 'manual' ? <AreaControls
            labelRef={noticeLabel}
            area={locationSelection.area} locale={locale} onChangeArea={(trigger) => { areaTrigger.current = trigger; setChoosingArea('locate'); }}
            onUseLocation={() => { clearHomeRoute(); continueOperation.current = 'locate'; useDeviceLocation(); }}
            buttonStyle={styles.dismiss} textStyle={styles.retry} labelStyle={styles.body} /> : null}
          <Pressable accessibilityLabel={t(locale, 'map.close')} accessibilityRole="button"
            onPress={() => setNotice(null)} style={styles.dismiss}>
            <Text style={styles.caption}>{t(locale, 'map.close')}</Text>
          </Pressable>
        </GlassPanel>
      ) : null}
      {failed ? (
        <GlassPanel style={styles.notice}>
          <Text style={styles.body}>{t(locale, 'map.pointsUnavailable')}</Text>
          <Pressable accessibilityLabel={t(locale, 'map.retry')} accessibilityRole="button" disabled={loading}
            accessibilityState={{ disabled: loading, busy: loading }} onPress={() => void refresh()} style={styles.dismiss}>
            {loading ? <ActivityIndicator color={dark.text} /> :
              <Text style={styles.retry}>{t(locale, 'map.retry')}</Text>}
          </Pressable>
        </GlassPanel>
      ) : null}
      {selected ? (
        <View onAccessibilityEscape={() => { setSelected(null); clearHomeRoute(); }}>
        <GlassPanel style={styles.pointCard}>
          <View style={styles.typeRow}>
            <View style={[styles.dot, { backgroundColor: pointColors[selected.properties.type] }]}
              accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            <Text style={[styles.caption, { flex: 1 }]}>{t(locale, `channel.${selected.properties.type}` as TranslationKey)}</Text>
          </View>
          <Text style={styles.pointName} accessibilityRole="header" maxFontSizeMultiplier={2}>{selected.properties.name}</Text>
          {selected.properties.address ? <Text style={styles.body}>{selected.properties.address}</Text> : null}
          {selected.properties.ewasteAccepts ? <Text style={styles.body}>{t(locale, 'map.accepts').replace(
            '{items}', selected.properties.ewasteAccepts.map((kind) => t(locale, ewasteAcceptTranslationKey(kind)))
              .join(locale === 'zh' ? '、' : ', '),
          )}</Text> : null}
          {origin ? <>
            {locationSelection.locationSource === 'manual' ? <Text ref={pointOrigin} accessible style={styles.caption}>
              {t(locale, 'location.fromArea').replace('{area}', locationSelection.area.names[locale])}</Text> : null}
            <WalkingRouteDetails locale={locale}
              distanceKm={straightLineKm(origin, selected.geometry.coordinates)}
              route={walking.route} retry={walking.retry} />
          </> : null}
          {!homeRequest ? <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'route.walkingRoute')}
            disabled={routeLocating} accessibilityState={{ disabled: routeLocating, busy: routeLocating }}
            onPress={() => void requestPointRoute()} style={styles.routeButton}>
            {routeLocating ? <ActivityIndicator color={dark.accent} /> :
              <Text style={styles.retry}>{t(locale, 'route.walkingRoute')}</Text>}
          </Pressable> : null}
        </GlassPanel>
        </View>
      ) : null}
      <GlassPanel style={[styles.searchBar, fontScale > 1 && styles.scaledRow]}>
        <Pressable ref={searchButton} accessibilityLabel={t(locale, 'map.searchItems')} accessibilityRole="button"
          onPress={() => { clearHomeRoute(); setSelected(null); onSearch(); }} style={[styles.search, fontScale > 1 && styles.scaledSearch]}>
          <MapIcon name="search" />
          <Text style={[styles.body, styles.searchText, fontScale > 1 && styles.scaledText]}>{t(locale, 'map.searchItems')}</Text>
        </Pressable>
        <Pressable accessibilityLabel={t(locale, 'map.camera')} accessibilityRole="button"
          onPress={() => { clearHomeRoute(); setSelected(null); onCamera(); }} style={[styles.camera, fontScale > 1 && styles.scaledCamera]}>
          <MapIcon name="camera" accent />
        </Pressable>
      </GlassPanel>
    </>
  );

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} accessible accessibilityLabel={t(locale, 'map.overview')} accessibilityRole="image">
      <Map ref={mapRef} style={StyleSheet.absoluteFill} mapStyle={mapStyle} attribution={false}
        logo={false} compass={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        onDidFinishLoadingMap={() => setReady(true)} onRegionIsChanging={cameraChanged}
        onRegionDidChange={(event) => {
          cameraChanged(event);
          const resolve = cameraSettled.current;
          cameraSettled.current = null;
          resolve?.();
        }}
        onPress={(event) => { if (ready && homeVisible) void pressMap(event).catch(reportError); }}>
        <Camera ref={cameraRef} initialViewState={initial} />
        <MapLayers points={points} visiblePointTypes={answerLayers ?? visibleTypes} user={user} destination={destination} route={route} distance={distance}
          neighborhood={neighborhood} reduceMotion={reduceMotion} />
      </Map>
      </View>

      {homeVisible ? <>
        <View style={[styles.top, { top: insets.top + dark.gap }]} pointerEvents="box-none">
          <GlassButton label={t(locale, 'bcrs.guideItem')} style={styles.bcrs}
            onPress={() => {
              clearHomeRoute(); setVisibleTypes(['return_point']); setSelected(null); setLayersOpen(false); onBcrsEntry();
            }}>
            <Text style={styles.bcrsText} maxFontSizeMultiplier={2}>BCRS</Text>
          </GlassButton>
          <View style={styles.tools}>
            <GlassButton label={t(locale, 'map.layers')} expanded={layersOpen}
              onPress={() => { clearHomeRoute(); setLayersOpen(!layersOpen); setSelected(null); setNotice(null); }}>
              <MapIcon name="layers" />
            </GlassButton>
            <GlassButton label={t(locale, 'map.locate')} disabled={!ready || locating} busy={locating}
              onPress={() => { setSelected(null); void locate(); }}>
              {locating ? <ActivityIndicator color={dark.text} /> : <MapIcon name="locate" />}
            </GlassButton>
          </View>
        </View>

        {layersOpen ? (
          <GlassPanel style={[styles.layers, { top: insets.top + 76, width: width - 96,
            maxHeight: height - Math.max(insets.bottom, dark.gap) - controlsHeight - dark.gap - insets.top - 76 }]}>
            <ScrollView alwaysBounceVertical={false}>
            <Text style={styles.panelTitle} accessibilityRole="header">{t(locale, 'map.layers')}</Text>
            {pointTypes.map((type) => (
              <View key={type} style={[styles.layerRow, fontScale > 1 && styles.scaledRow]}>
                <View style={[styles.dot, { backgroundColor: pointColors[type] }]}
                  accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                <Text style={[styles.body, styles.layerName, fontScale > 1 && styles.scaledText]}>{label(type)}</Text>
                <Switch accessibilityLabel={t(locale, `channel.${type}` as TranslationKey)} accessibilityRole="switch" style={styles.layerSwitch}
                  value={visibleTypes.includes(type)} trackColor={{ false: '#71839a', true: '#008d56' }}
                  ios_backgroundColor="#71839a"
                  thumbColor={dark.text} onValueChange={(enabled) => {
                    setVisibleTypes(enabled ? [...visibleTypes, type] : visibleTypes.filter((value) => value !== type));
                  }} />
              </View>
            ))}
            </ScrollView>
          </GlassPanel>
        ) : null}

        <View style={[styles.bottom, { bottom: Math.max(insets.bottom, dark.gap) }]} pointerEvents="box-none"
          onLayout={(event) => setControlsHeight(event.nativeEvent.layout.height)}>
          {fontScale > 1 ? <ScrollView alwaysBounceVertical={false}
            style={{ maxHeight: height - insets.top - insets.bottom - 144 }}
            contentContainerStyle={styles.bottomContent}>
            {bottomContent}
          </ScrollView> : bottomContent}
        </View>
      </> : null}
      {!attributionAboveChildren ? overlayAttribution : null}
      <SharedMapContext.Provider value={{ ready, reduceMotion, width, height, move, moveAndWait, setDestination, setRoute, setDistance, setAnswerLayers }}>
        {children}
      </SharedMapContext.Provider>
      {attributionAboveChildren ? overlayAttribution : null}
      <AreaPicker visible={choosingArea !== null} locale={locale} reduceMotion={reduceMotion} onDismiss={() => {
        if (areaSelected.current) setAreaFocus(areaOperation.current);
        else focusAccessibility(areaTrigger.current);
        areaSelected.current = false;
      }} onClose={() => {
        setChoosingArea(null);
      }} onSelect={(area) => {
        areaSelected.current = true;
        areaOperation.current = choosingArea!;
        continueOperation.current = choosingArea;
        clearHomeRoute(); selectArea(area); setChoosingArea(null);
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  scaledRow: { flexDirection: 'column', alignItems: 'stretch' },
  scaledText: { flex: 0, width: '100%' },
  scaledSearch: { flex: 0, width: '100%', flexDirection: 'column', paddingHorizontal: 16, paddingVertical: 12 },
  scaledCamera: { width: '100%' },
  root: { flex: 1, backgroundColor: dark.background },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bcrs: { paddingHorizontal: 16 },
  bcrsText: { color: dark.text, fontSize: dark.body, fontWeight: '700', letterSpacing: 1 },
  tools: { gap: dark.gap },
  layers: { position: 'absolute', right: 80, padding: 16, borderRadius: 22 },
  panelTitle: { color: dark.text, fontSize: dark.body, fontWeight: '700', marginBottom: 8 },
  layerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: dark.button },
  layerSwitch: { alignSelf: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  layerName: { flex: 1 },
  body: { color: dark.text, fontSize: dark.body, lineHeight: 23 },
  caption: { color: dark.muted, fontSize: dark.caption, lineHeight: 20 },
  bottom: { position: 'absolute', left: 16, right: 16, gap: dark.gap },
  bottomContent: { gap: dark.gap },
  attributionRow: { minHeight: dark.button, alignItems: 'flex-start', justifyContent: 'center' },
  overlayAttribution: { position: 'absolute', left: 16, minHeight: dark.button, justifyContent: 'center' },
  attribution: { minWidth: 24, minHeight: 24, marginLeft: 14, paddingHorizontal: 6, paddingVertical: 2,
    alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: 'rgba(3, 11, 23, 0.9)' },
  notice: { paddingHorizontal: 16, paddingTop: 16 },
  dismiss: { minHeight: dark.button, justifyContent: 'center', alignSelf: 'flex-start' },
  retry: { color: dark.accent, fontSize: dark.body, fontWeight: '700' },
  pointCard: { padding: 20, gap: 8 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointName: { color: dark.text, fontSize: 20, fontWeight: '700' },
  routeButton: { minHeight: dark.button, justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 40, padding: 5 },
  search: { flex: 1, minHeight: dark.camera, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8, gap: 12 },
  searchText: { flex: 1 },
  camera: { width: dark.camera, height: dark.camera, borderRadius: dark.camera / 2,
    backgroundColor: dark.accent, alignItems: 'center', justifyContent: 'center' },
});
