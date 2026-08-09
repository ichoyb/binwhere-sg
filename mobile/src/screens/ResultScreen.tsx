import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CHANNEL_DISPLAY_CONFIG,
  LOW_CONFIDENCE_THRESHOLD,
  STATUS_CONFIG,
  formatDistance,
  estimateWalkTime,
  getFriendlyApiError,
  isSingaporeCoordinates,
  t,
  type ClassifyResult,
  type Locale,
  type NearbyPoint,
  type TranslationKey,
  type ApiErrorCode,
} from '@binwhere/core';
import { ApiError, fetchNearby } from '../api/client';
import type { UserLocation } from '../hooks/useGeolocation';
import { openWalkingDirections } from '../lib/navigation';
import { getNearbyTarget } from '../lib/nearby';
import { colors, radii, spacing, touch } from '../theme/colors';

interface Props {
  result: ClassifyResult;
  locale: Locale;
  capturedImage: string | null;
  userLocation: UserLocation | null;
  geoLoading: boolean;
  geoError: string | null;
  onScanAgain: () => void;
  onViewNearby: () => void;
  onRequestLocation: () => void;
}

export function ResultScreen({
  result,
  locale,
  capturedImage,
  userLocation,
  geoLoading,
  geoError,
  onScanAgain,
  onViewNearby,
  onRequestLocation,
}: Props) {
  const status = STATUS_CONFIG[result.status];
  const channel = result.channel;
  const channelCfg = channel ? CHANNEL_DISPLAY_CONFIG[channel] : null;
  const nearbyTarget = getNearbyTarget(result);
  const nearbyChannel = nearbyTarget?.channel ?? null;
  const acceptedItem = nearbyTarget?.acceptedItem;
  const isInSingapore = userLocation
    ? isSingaporeCoordinates(userLocation.lat, userLocation.lng)
    : false;
  const [nearest, setNearest] = useState<NearbyPoint | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<ApiErrorCode | null>(null);

  useEffect(() => {
    if (!userLocation || !nearbyChannel || !isInSingapore) {
      setNearest(null);
      setNearbyError(null);
      setNearbyLoading(false);
      return;
    }
    let cancelled = false;
    setNearbyLoading(true);
    setNearbyError(null);
    fetchNearby({
      lat: userLocation.lat,
      lng: userLocation.lng,
      channel: nearbyChannel,
      limit: 1,
      acceptedItem,
    })
      .then((res) => {
        if (!cancelled) setNearest(res.results[0] ?? null);
      })
      .catch((e) => {
        if (!cancelled) {
          setNearest(null);
          setNearbyError(e instanceof ApiError ? e.code : 'UNKNOWN');
        }
      })
      .finally(() => {
        if (!cancelled) setNearbyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [acceptedItem, isInSingapore, nearbyChannel, userLocation]);

  const statusLabel = t(locale, `status.${result.status}` as TranslationKey);
  const channelLabel = channel
    ? t(locale, `channel.${channel}` as TranslationKey)
    : null;
  const instruction = channel
    ? t(locale, `instruction.${channel}` as TranslationKey)
    : null;
  const isHazardous = channel === 'hazardous';
  const isBcrs = channel === 'return_point';

  const shareResult = async () => {
    const lines = [
      `${statusLabel}: ${result.item}`,
      result.reason,
      instruction,
      ...(result.preparation ?? []).map((step, index) => `${index + 1}. ${step}`),
      result.tip ? `${t(locale, 'result.tip')}${result.tip}` : null,
      'https://binwhere.sg',
    ].filter((line): line is string => !!line);
    await Share.share({ message: lines.join('\n\n') });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={onScanAgain} style={styles.backBtn}>
          <Text style={styles.backText}>← {t(locale, 'result.back')}</Text>
        </Pressable>
        <Pressable onPress={() => void shareResult()} style={styles.shareBtn}>
          <Text style={styles.shareText}>{t(locale, 'result.share')}</Text>
        </Pressable>
      </View>

      <View style={[styles.statusHeader, { backgroundColor: status.bgColor }]}>
        <Text style={[styles.statusLabel, { color: status.textColor }]}>
          {statusLabel}
        </Text>
        <Text style={[styles.itemName, { color: status.textColor }]}>{result.item}</Text>
        {result.confidence < LOW_CONFIDENCE_THRESHOLD ? (
          <Text style={styles.lowConf}>{t(locale, 'result.lowConfidence')}</Text>
        ) : null}
      </View>

      {capturedImage ? (
        <Image source={{ uri: capturedImage }} style={styles.capture} resizeMode="cover" />
      ) : null}

      <View style={styles.card}>
        <Text style={styles.reason}>{result.reason}</Text>
        {channelLabel ? (
          <View
            style={[
              styles.channelTag,
              {
                backgroundColor: channelCfg?.bgColor ?? colors.bg,
                borderColor: channelCfg?.borderColor ?? colors.border,
              },
            ]}
          >
            <Text style={{ color: channelCfg?.textColor ?? colors.text, fontWeight: '600' }}>
              {channelLabel}
            </Text>
            {instruction ? (
              <Text style={{ color: channelCfg?.textColor ?? colors.textMuted, marginTop: 4 }}>
                {instruction}
              </Text>
            ) : null}
          </View>
        ) : null}

        {result.preparation && result.preparation.length > 0 ? (
          <View style={styles.prepBlock}>
            <Text style={styles.prepTitle}>{t(locale, 'result.beforeYouGo')}</Text>
            {result.preparation.map((step, i) => (
              <Text key={i} style={styles.prepStep}>
                {i + 1}. {step}
              </Text>
            ))}
          </View>
        ) : null}

        {result.tip ? (
          <Text style={styles.tip}>
            <Text style={styles.tipLabel}>{t(locale, 'result.tip')}</Text>
            {result.tip}
          </Text>
        ) : null}
      </View>

      {isBcrs ? (
        <View style={[styles.card, { backgroundColor: '#E8F8EF', borderColor: '#B8E6C8' }]}>
          <Text style={[styles.prepTitle, { color: '#065F46' }]}>{t(locale, 'bcrs.title')}</Text>
          <Text style={{ color: '#065F46', marginTop: 4 }}>{t(locale, 'bcrs.eligible')}</Text>
          <Text style={{ color: '#065F46', marginTop: 4 }}>{t(locale, 'bcrs.excluded')}</Text>
          <Text style={{ color: '#065F46', marginTop: 4 }}>{t(locale, 'bcrs.pointCount')}</Text>
        </View>
      ) : null}

      {isHazardous ? (
        <View
          style={[
            styles.card,
            {
              backgroundColor: CHANNEL_DISPLAY_CONFIG.hazardous.bgColor,
              borderColor: CHANNEL_DISPLAY_CONFIG.hazardous.borderColor,
            },
          ]}
        >
          <Text
            style={[
              styles.prepTitle,
              { color: CHANNEL_DISPLAY_CONFIG.hazardous.textColor },
            ]}
          >
            {t(locale, 'hazardous.title')}
          </Text>
          <Pressable onPress={() => Linking.openURL('tel:+6562255632')}>
            <Text style={styles.link}>
              {t(locale, 'hazardous.hotline')}
            </Text>
          </Pressable>
          <Text style={styles.hazardBody}>{t(locale, 'hazardous.hotlineHint')}</Text>
          <Pressable
            onPress={() =>
              Linking.openURL(
                'https://www.nea.gov.sg/our-services/pollution-control/toxic-industrial-waste',
              )
            }
          >
            <Text style={styles.link}>{t(locale, 'hazardous.toxicWaste')}</Text>
          </Pressable>
          <Text style={styles.hazardBody}>{t(locale, 'hazardous.pharmacy')}</Text>
          <Text style={styles.hazardBody}>{t(locale, 'hazardous.events')}</Text>
        </View>
      ) : null}

      {nearbyChannel ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {result.channel === 'bulky_waste'
              ? t(locale, 'result.considerDonating')
              : t(locale, 'result.nearby')}
          </Text>
          {geoLoading || nearbyLoading ? (
            <View style={styles.row}>
              <ActivityIndicator color={colors.neaGreen} />
              <Text style={styles.muted}> {t(locale, 'result.gettingLocation')}</Text>
            </View>
          ) : geoError === 'permission_denied' ? (
            <Pressable onPress={onRequestLocation} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>{t(locale, 'result.tapToFind')}</Text>
              <Text style={styles.muted}>{t(locale, 'result.requiresLocation')}</Text>
            </Pressable>
          ) : !userLocation ? (
            <Pressable onPress={onRequestLocation} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>{t(locale, 'result.tapToFind')}</Text>
              <Text style={styles.muted}>
                {geoError ? t(locale, 'error.generic') : t(locale, 'result.requiresLocation')}
              </Text>
            </Pressable>
          ) : userLocation && !isInSingapore ? (
            <View style={styles.regionNotice}>
              <Text style={styles.regionTitle}>{t(locale, 'result.onlyInSG')}</Text>
              <Text style={styles.muted}>{t(locale, 'result.sgDataOnly')}</Text>
            </View>
          ) : nearbyError ? (
            <Pressable onPress={onRequestLocation} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>{t(locale, 'shared.tryAgain')}</Text>
              <Text style={styles.muted}>{getFriendlyApiError(nearbyError, locale)}</Text>
            </Pressable>
          ) : nearest ? (
            <>
              <Text style={styles.pointName}>{nearest.name}</Text>
              <Text style={styles.muted}>{nearest.address}</Text>
              {nearest.openingHours ? (
                <Text style={styles.muted}>
                  {t(locale, 'bcrs.openingHours')}: {nearest.openingHours}
                </Text>
              ) : null}
              <Text style={styles.distance}>
                {formatDistance(nearest.distanceKm)} · {estimateWalkTime(nearest.distanceKm)}{' '}
                {t(locale, 'shared.walk')}
              </Text>
              <Pressable
                onPress={() => openWalkingDirections(nearest.lat, nearest.lng)}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>{t(locale, 'map.navigate')}</Text>
              </Pressable>
              <Pressable onPress={onViewNearby} style={styles.linkBtn}>
                <Text style={styles.linkText}>{t(locale, 'nearby.nearby')} →</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.muted}>{t(locale, 'nearby.noPoints')}</Text>
          )}
        </View>
      ) : null}

      <Pressable onPress={onScanAgain} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>{t(locale, 'result.scanAnother')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backBtn: { minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 16, color: colors.blueBin, fontWeight: '600' },
  shareBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  shareText: { fontSize: 15, color: colors.blueBin, fontWeight: '600' },
  statusHeader: {
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  itemName: { fontSize: 22, fontWeight: '700' },
  lowConf: { marginTop: 8, fontSize: 13, color: colors.textMuted },
  capture: {
    width: '100%',
    height: 180,
    borderRadius: radii.card,
    marginBottom: spacing.md,
    backgroundColor: colors.border,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reason: { fontSize: 16, color: colors.text, lineHeight: 22 },
  channelTag: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.button,
    borderWidth: 1,
  },
  prepBlock: { marginTop: spacing.md },
  prepTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  prepStep: { fontSize: 15, color: colors.text, marginBottom: 4, lineHeight: 20 },
  tip: { marginTop: spacing.md, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  tipLabel: { fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  muted: { fontSize: 14, color: colors.textMuted },
  pointName: { fontSize: 16, fontWeight: '600', color: colors.text },
  distance: { fontSize: 14, color: colors.blueBin, marginVertical: spacing.sm, fontWeight: '600' },
  primaryBtn: {
    minHeight: touch.minHeight,
    backgroundColor: colors.neaGreen,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    minHeight: touch.minHeight,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: colors.neaGreen },
  regionNotice: {
    borderRadius: radii.button,
    padding: spacing.sm,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  regionTitle: { color: '#92400E', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  linkBtn: { marginTop: spacing.sm, alignItems: 'center' },
  linkText: { color: colors.blueBin, fontSize: 15, fontWeight: '600' },
  link: {
    color: CHANNEL_DISPLAY_CONFIG.hazardous.textColor,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginTop: 8,
  },
  hazardBody: {
    color: CHANNEL_DISPLAY_CONFIG.hazardous.textColor,
    marginTop: 6,
    fontSize: 14,
    opacity: 0.9,
  },
});
