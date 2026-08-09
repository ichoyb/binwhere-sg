import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  estimateWalkTime,
  formatDistance,
  getFriendlyApiError,
  isSingaporeCoordinates,
  t,
  type ApiErrorCode,
  type ClassifyResult,
  type Locale,
  type NearbyPoint,
  type TranslationKey,
} from '@binwhere/core';
import { ApiError, fetchNearby } from '../api/client';
import type { UserLocation } from '../hooks/useGeolocation';
import { openWalkingDirections } from '../lib/navigation';
import { getNearbyTarget } from '../lib/nearby';
import { colors, radii, spacing, touch } from '../theme/colors';

interface Props {
  result: ClassifyResult;
  locale: Locale;
  userLocation: UserLocation | null;
  geoLoading: boolean;
  geoError: string | null;
  onBack: () => void;
  onRequestLocation: () => void;
}

const MACHINE_STATUS_KEYS: Record<string, TranslationKey> = {
  PRE_LAUNCH: 'bcrs.machinePreLaunch',
  ONLINE: 'bcrs.machineOnline',
  OFFLINE: 'bcrs.machineOffline',
  MAINTENANCE: 'bcrs.machineMaintenance',
};

export function NearbyScreen({
  result,
  locale,
  userLocation,
  geoLoading,
  geoError,
  onBack,
  onRequestLocation,
}: Props) {
  const nearbyTarget = getNearbyTarget(result);
  const nearbyChannel = nearbyTarget?.channel ?? null;
  const acceptedItem = nearbyTarget?.acceptedItem;
  const isInSingapore = userLocation
    ? isSingaporeCoordinates(userLocation.lat, userLocation.lng)
    : false;
  const [points, setPoints] = useState<NearbyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    if (!userLocation || !nearbyChannel || !isInSingapore) {
      setPoints([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchNearby({
      lat: userLocation.lat,
      lng: userLocation.lng,
      channel: nearbyChannel,
      limit: 20,
      acceptedItem,
    })
      .then((res) => {
        if (!cancelled) setPoints(res.results);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.code : 'UNKNOWN');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [acceptedItem, isInSingapore, nearbyChannel, userLocation]);

  const showLocationPrompt = !userLocation || geoError === 'permission_denied';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← {t(locale, 'result.back')}</Text>
          </Pressable>
          <View style={styles.toggle}>
            <Pressable
              onPress={() => setViewMode('list')}
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
                {t(locale, 'shared.list')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('map')}
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
                {t(locale, 'shared.map')}
              </Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.title}>
          {result.channel === 'bulky_waste'
            ? t(locale, 'result.considerDonating')
            : t(locale, 'nearby.nearby')}
        </Text>
      </View>

      {!nearbyChannel ? (
        <Text style={styles.muted}>{t(locale, 'nearby.noPoints')}</Text>
      ) : geoLoading && !userLocation ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.neaGreen} />
          <Text style={styles.muted}>{t(locale, 'result.gettingLocation')}</Text>
        </View>
      ) : showLocationPrompt ? (
        <View style={styles.center}>
          <Text style={styles.promptTitle}>
            {geoError === 'permission_denied'
              ? t(locale, 'result.requiresLocation')
              : t(locale, 'result.tapToFind')}
          </Text>
          <Text style={styles.muted}>{t(locale, 'result.sgDataOnly')}</Text>
          <Pressable onPress={onRequestLocation} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t(locale, 'result.tapToFind')}</Text>
          </Pressable>
        </View>
      ) : userLocation && !isInSingapore ? (
        <View style={styles.center}>
          <Text style={styles.promptTitle}>{t(locale, 'result.onlyInSG')}</Text>
          <Text style={styles.muted}>{t(locale, 'result.sgDataOnly')}</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator color={colors.neaGreen} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{getFriendlyApiError(error, locale)}</Text>
          <Pressable onPress={onRequestLocation} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t(locale, 'shared.tryAgain')}</Text>
          </Pressable>
        </View>
      ) : points.length === 0 ? (
        <Text style={styles.muted}>{t(locale, 'nearby.noPoints')}</Text>
      ) : viewMode === 'map' && userLocation ? (
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
        >
          <Marker
            coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            title={t(locale, 'map.youAreHere')}
            pinColor={colors.neaGreen}
          />
          {points.map((point, index) => (
            <Marker
              key={`${point.lat},${point.lng},${index}`}
              coordinate={{ latitude: point.lat, longitude: point.lng }}
              title={point.name}
              description={`${formatDistance(point.distanceKm)} · ${estimateWalkTime(point.distanceKm)} ${t(locale, 'shared.walk')}`}
              pinColor={colors.blueBin}
            />
          ))}
        </MapView>
      ) : (
        <FlatList
          data={points}
          keyExtractor={(item, index) => `${item.lat},${item.lng},${index}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.address}>{item.address}</Text>
              {item.openingHours ? (
                <Text style={styles.meta}>
                  {t(locale, 'bcrs.openingHours')}: {item.openingHours}
                </Text>
              ) : null}
              {item.machineStatus ? (
                <Text style={styles.meta}>
                  {MACHINE_STATUS_KEYS[item.machineStatus]
                    ? t(locale, MACHINE_STATUS_KEYS[item.machineStatus])
                    : item.machineStatus}
                </Text>
              ) : null}
              {item.reuseType ? <Text style={styles.meta}>{item.reuseType}</Text> : null}
              {item.accepts ? <Text style={styles.meta}>{item.accepts}</Text> : null}
              <Text style={styles.distance}>
                {formatDistance(item.distanceKm)} · {estimateWalkTime(item.distanceKm)}{' '}
                {t(locale, 'shared.walk')}
              </Text>
              <Pressable
                onPress={() => openWalkingDirections(item.lat, item.lng)}
                style={styles.navBtn}
              >
                <Text style={styles.navBtnText}>{t(locale, 'map.navigate')}</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { minHeight: 40, justifyContent: 'center' },
  backText: { fontSize: 16, color: colors.blueBin, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 4 },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.white },
  toggleBtnActive: { backgroundColor: colors.neaGreen },
  toggleText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: colors.white },
  map: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  address: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  distance: {
    fontSize: 14,
    color: colors.blueBin,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  navBtn: {
    marginTop: spacing.sm,
    minHeight: touch.minHeight - 8,
    borderRadius: radii.button,
    backgroundColor: colors.neaGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  muted: {
    margin: spacing.md,
    fontSize: 15,
    color: colors.textMuted,
  },
  error: { marginHorizontal: spacing.md, color: colors.danger, fontSize: 15 },
  center: { padding: spacing.md, alignItems: 'stretch' },
  promptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    marginTop: spacing.md,
    minHeight: touch.minHeight,
    backgroundColor: colors.neaGreen,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
