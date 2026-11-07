import {
  DATA_LICENSE_URL, formatDistance, isSingaporeCoordinates, t,
  type Locale, type PointsLayer, type TranslationKey,
} from '@binwhere/core';
import {
  Camera, Map, type CameraRef, type MapRef, type PressEvent, type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Linking, Pressable, StyleSheet, Switch, Text, View,
  useWindowDimensions, type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton, GlassPanel } from '../components/Glass';
import { MapIcon } from '../components/MapIcon';
import { usePoints } from '../hooks/usePoints';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { reportError } from '../lib/reporting';
import { straightLineKm } from '../lib/straight-line-distance';
import { MapLayers, emptyMapData, type MapLabels } from '../map/MapLayers';
import { cameraCommand, createMapCamera, islandCamera, type MapCameraTarget } from '../map/camera';
import { pointsToGeoJSON, pointTypes, type MapPoints } from '../map/points';
import { mapStyle, neighborhoodMinZoom, pointColors } from '../map/style';
import { useAppState } from '../state/AppState';
import { dark } from '../theme/dark';
import { SharedMapContext } from '../map/SharedMap';

interface Props {
  locale: Locale;
  onSearch: () => void;
  onCamera: () => void;
  onBcrsEntry: () => void;
  homeVisible: boolean;
  children: ReactNode;
}

export function MapHomeScreen({ locale, onSearch, onCamera, onBcrsEntry, homeVisible, children }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const initial = useRef(cameraCommand(islandCamera(width, height), 0)).current;
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const [ready, setReady] = useState(false);
  const [neighborhood, setNeighborhood] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<PointsLayer[]>([...pointTypes]);
  const [selected, setSelected] = useState<MapPoints['features'][number] | null>(null);
  const [attributionExpanded, setAttributionExpanded] = useState(true);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [locating, setLocating] = useState(false);
  const [destination, setDestination] = useState<MapLabels>(emptyMapData);
  const [answerLayers, setAnswerLayers] = useState<PointsLayer[] | null>(null);
  const reduceMotion = useReduceMotion();
  const { location, requestLocation } = useAppState();
  const { response, failed, loading, refresh } = usePoints();
  const points = useMemo(() => response ? pointsToGeoJSON(response) : emptyMapData, [response]);
  const inSingapore = location !== null && isSingaporeCoordinates(location.lat, location.lng);
  const user = useMemo<MapLabels>(() => inSingapore ? {
    type: 'FeatureCollection', features: [{ type: 'Feature',
      geometry: { type: 'Point', coordinates: [location.lng, location.lat] }, properties: { label: '' } }],
  } : emptyMapData, [inSingapore, location]);

  useEffect(() => {
    const timer = setTimeout(() => setAttributionExpanded(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => setSelected(null), [points]);

  const move = useCallback(async (target: MapCameraTarget, durationMs = 1000) => {
    const camera = createMapCamera(mapRef.current!, cameraRef.current!);
    if (reduceMotion) await camera.jumpTo(target);
    else await camera.flyTo(target, durationMs);
  }, [reduceMotion]);

  const locate = async () => {
    setLocating(true);
    setNotice(null);
    setSelected(null);
    setLayersOpen(false);
    try {
      const result = await requestLocation();
      const next = result.location;
      if (!next) {
        setNotice(result.error === 'permission_denied' ? 'map.locationDenied' : 'map.locationUnavailable');
      } else if (!isSingaporeCoordinates(next.lat, next.lng)) {
        setNotice('map.locationOutsideSingapore');
      } else {
        await move({ center: [next.lng, next.lat], zoom: 16, pitch: 25, bearing: 0 });
      }
    } catch (error) {
      setNotice('map.locationUnavailable');
      reportError(error, { operation: 'map-locate' });
    } finally {
      setLocating(false);
    }
  };

  const pressMap = async ({ nativeEvent }: NativeSyntheticEvent<PressEvent>) => {
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
      if (point) setSelected(point);
    }
  };

  const cameraChanged = ({ nativeEvent }: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    setNeighborhood(nativeEvent.zoom >= neighborhoodMinZoom);
    if (nativeEvent.userInteraction) {
      setAttributionExpanded(false);
      setSelected(null);
    }
  };
  const label = (type: PointsLayer) => type === 'return_point' ? 'BCRS'
    : t(locale, `channel.${type}` as TranslationKey);
  const openLicense = () => {
    void Linking.openURL(DATA_LICENSE_URL).catch((error) => reportError(error, { operation: 'open-data-license' }));
  };

  return (
    <View style={styles.root}>
      <Map ref={mapRef} style={StyleSheet.absoluteFill} mapStyle={mapStyle} attribution={false}
        logo={false} compass={false} accessibilityLabel={t(locale, 'map.overview')} accessibilityRole="image"
        onDidFinishLoadingMap={() => setReady(true)} onRegionIsChanging={cameraChanged}
        onRegionDidChange={cameraChanged}
        onPress={(event) => { if (ready && homeVisible) void pressMap(event).catch(reportError); }}>
        <Camera ref={cameraRef} initialViewState={initial} />
        <MapLayers points={points} visiblePointTypes={answerLayers ?? visibleTypes} user={user} destination={destination}
          neighborhood={neighborhood} reduceMotion={reduceMotion} />
      </Map>

      {homeVisible ? <>
        <View style={[styles.top, { top: insets.top + dark.gap }]} pointerEvents="box-none">
          <GlassButton label={t(locale, 'bcrs.guideItem')} style={styles.bcrs}
            onPress={() => {
              setVisibleTypes(['return_point']); setSelected(null); setLayersOpen(false); onBcrsEntry();
            }}>
            <Text style={styles.bcrsText}>BCRS</Text>
          </GlassButton>
          <View style={styles.tools}>
            <GlassButton label={t(locale, 'map.layers')} selected={layersOpen}
              onPress={() => { setLayersOpen(!layersOpen); setSelected(null); setNotice(null); }}>
              <MapIcon name="layers" />
            </GlassButton>
            <GlassButton label={t(locale, 'map.locate')} disabled={!ready || locating}
              onPress={() => void locate()}>
              {locating ? <ActivityIndicator color={dark.text} /> : <MapIcon name="locate" />}
            </GlassButton>
          </View>
        </View>

        {layersOpen ? (
          <GlassPanel style={[styles.layers, { top: insets.top + 76, width: width - 96 }]}>
            <Text style={styles.panelTitle}>{t(locale, 'map.layers')}</Text>
            {pointTypes.map((type) => (
              <View key={type} style={styles.layerRow}>
                <View style={[styles.dot, { backgroundColor: pointColors[type] }]} />
                <Text style={[styles.body, styles.layerName]}>{label(type)}</Text>
                <Switch accessibilityLabel={label(type)} accessibilityRole="switch" style={styles.layerSwitch}
                  value={visibleTypes.includes(type)} trackColor={{ false: '#71839a', true: '#008d56' }}
                  ios_backgroundColor="#71839a"
                  thumbColor={dark.text} onValueChange={(enabled) => {
                    setVisibleTypes(enabled ? [...visibleTypes, type] : visibleTypes.filter((value) => value !== type));
                  }} />
              </View>
            ))}
          </GlassPanel>
        ) : null}

        <View style={[styles.bottom, { bottom: Math.max(insets.bottom, dark.gap) }]} pointerEvents="box-none">
          <View style={styles.attributionRow} pointerEvents="box-none">
            <Pressable accessibilityLabel={t(locale, 'map.dataLicense')} accessibilityRole="link"
              onPress={openLicense} style={styles.attribution} hitSlop={14}>
              <Text style={styles.caption}>{attributionExpanded ? '© OpenStreetMap' : 'ⓘ'}</Text>
            </Pressable>
          </View>
          {notice ? (
            <GlassPanel style={styles.notice}>
              <Text style={styles.body} accessibilityLiveRegion="polite">{t(locale, notice)}</Text>
              <Pressable accessibilityLabel={t(locale, 'map.close')} accessibilityRole="button"
                onPress={() => setNotice(null)} style={styles.dismiss}>
                <Text style={styles.caption}>{t(locale, 'map.close')}</Text>
              </Pressable>
            </GlassPanel>
          ) : null}
          {failed ? (
            <GlassPanel style={styles.notice}>
              <Text style={styles.body} accessibilityLiveRegion="polite">{t(locale, 'map.pointsUnavailable')}</Text>
              <Pressable accessibilityLabel={t(locale, 'map.retry')} accessibilityRole="button" disabled={loading}
                accessibilityState={{ disabled: loading }} onPress={() => void refresh()} style={styles.dismiss}>
                {loading ? <ActivityIndicator color={dark.text} /> :
                  <Text style={styles.retry}>{t(locale, 'map.retry')}</Text>}
              </Pressable>
            </GlassPanel>
          ) : null}
          {selected ? (
            <GlassPanel style={styles.pointCard}>
              <View style={styles.typeRow}>
                <View style={[styles.dot, { backgroundColor: pointColors[selected.properties.type] }]} />
                <Text style={styles.caption}>{t(locale, `channel.${selected.properties.type}` as TranslationKey)}</Text>
              </View>
              <Text style={styles.pointName}>{selected.properties.name}</Text>
              {selected.properties.address ? <Text style={styles.body}>{selected.properties.address}</Text> : null}
              {inSingapore ? <Text style={styles.distance}>
                {t(locale, 'map.straightLine')} · {formatDistance(straightLineKm(location, selected.geometry.coordinates))}
              </Text> : null}
            </GlassPanel>
          ) : null}
          <GlassPanel style={styles.searchBar}>
            <Pressable accessibilityLabel={t(locale, 'map.searchItems')} accessibilityRole="button"
              onPress={onSearch} style={styles.search}>
              <MapIcon name="search" />
              <Text style={[styles.body, styles.searchText]}>{t(locale, 'map.searchItems')}</Text>
            </Pressable>
            <Pressable accessibilityLabel={t(locale, 'map.camera')} accessibilityRole="button"
              onPress={onCamera} style={styles.camera}>
              <MapIcon name="camera" accent />
            </Pressable>
          </GlassPanel>
        </View>
      </> : null}
      {!homeVisible ? <View style={[styles.overlayAttribution, { top: insets.top + 12 }]}>
        <Pressable accessibilityLabel={t(locale, 'map.dataLicense')} accessibilityRole="link"
          onPress={openLicense} style={styles.attribution} hitSlop={14}>
          <Text style={styles.caption}>{attributionExpanded ? '© OpenStreetMap' : 'ⓘ'}</Text>
        </Pressable>
      </View> : null}
      <SharedMapContext.Provider value={{ ready, reduceMotion, width, height, move, setDestination, setAnswerLayers }}>
        {children}
      </SharedMapContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
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
  attributionRow: { height: dark.button, alignItems: 'flex-start', justifyContent: 'center' },
  overlayAttribution: { position: 'absolute', left: 16, height: dark.button, justifyContent: 'center' },
  attribution: { minWidth: 24, minHeight: 24, marginLeft: 14, paddingHorizontal: 6, paddingVertical: 2,
    alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: 'rgba(3, 11, 23, 0.9)' },
  notice: { paddingHorizontal: 16, paddingTop: 16 },
  dismiss: { minHeight: dark.button, justifyContent: 'center', alignSelf: 'flex-start' },
  retry: { color: dark.accent, fontSize: dark.body, fontWeight: '700' },
  pointCard: { padding: 20, gap: 8 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointName: { color: dark.text, fontSize: 20, fontWeight: '700' },
  distance: { color: dark.accent, fontSize: dark.caption, lineHeight: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 40, padding: 5 },
  search: { flex: 1, minHeight: dark.camera, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8, gap: 12 },
  searchText: { flex: 1 },
  camera: { width: dark.camera, height: dark.camera, borderRadius: dark.camera / 2,
    backgroundColor: dark.accent, alignItems: 'center', justifyContent: 'center' },
});
