import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView } from 'expo-camera';
import {
  getFriendlyError,
  getFriendlyApiError,
  getItemCategories,
  LOCALE_OPTIONS,
  PRIVACY_POLICY_URL,
  STATUS_CONFIG,
  SUPPORT_URL,
  t,
  type ClassifyResult,
  type Locale,
  type ScanHistoryItem,
} from '@binwhere/core';
import { ApiError, classifyItem } from '../api/client';
import { useCamera } from '../hooks/useCamera';
import { prepareImageForClassify } from '../lib/image-prep';
import { colors, radii, spacing, touch } from '../theme/colors';

interface Props {
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
  history: ScanHistoryItem[];
  onHistorySelect: (item: ScanHistoryItem) => void;
  onHistoryClear: () => void;
  onClassified: (result: ClassifyResult, imageUri: string | null) => void;
  onCategorySelect: (result: ClassifyResult) => void;
  onBcrsEntry: () => void;
}

export function HomeScreen({
  locale,
  onLocaleChange,
  history,
  onHistorySelect,
  onHistoryClear,
  onClassified,
  onCategorySelect,
  onBcrsEntry,
}: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const camera = useCamera();

  const categories = getItemCategories(locale);

  const runClassify = useCallback(
    async (params: { image?: string; text?: string }, imageUri: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const result = await classifyItem({ ...params, locale });
        onClassified(result, imageUri);
      } catch (e) {
        setError(
          e instanceof ApiError
            ? getFriendlyApiError(e.code, locale)
            : getFriendlyError(e instanceof Error ? e.message : String(e), locale),
        );
      } finally {
        setLoading(false);
      }
    },
    [locale, onClassified],
  );

  const submitText = useCallback(async () => {
    const value = text.trim();
    if (!value || loading) return;
    setText('');
    await runClassify({ text: value }, null);
  }, [text, loading, runClassify]);

  const openCamera = useCallback(async () => {
    setError(null);
    await camera.start();
  }, [camera]);

  const snapAndClassify = useCallback(async () => {
    if (loading || camera.busy) return;
    setError(null);
    setLoading(true);
    try {
      const photo = await camera.capture();
      if (!photo) {
        setError(getFriendlyError('Classification failed', locale));
        return;
      }
      const base64 = await prepareImageForClassify(photo);
      camera.stop();
      const result = await classifyItem({ image: base64, locale });
      onClassified(result, photo.uri);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? getFriendlyApiError(e.code, locale)
          : getFriendlyError(e instanceof Error ? e.message : String(e), locale),
      );
    } finally {
      setLoading(false);
    }
  }, [loading, camera, locale, onClassified]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>BinWhere</Text>
        <View style={styles.localeRow}>
          {LOCALE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => onLocaleChange(opt.value)}
              style={[styles.localeChip, locale === opt.value && styles.localeChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: locale === opt.value }}
            >
              <Text
                style={[
                  styles.localeText,
                  locale === opt.value && styles.localeTextActive,
                ]}
              >
                {opt.short}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.title}>{t(locale, 'home.snapToKnow')}</Text>
      <Text style={styles.subtitle}>{t(locale, 'home.recycleRight')}</Text>

      {/* Camera identify path */}
      <View style={styles.card}>
        {camera.active && camera.permission?.granted ? (
          <View style={styles.cameraWrap}>
            <CameraView
              ref={camera.cameraRef}
              style={styles.camera}
              facing="back"
              mode="picture"
            />
            <Text style={styles.cameraGuide}>{t(locale, 'home.cameraGuide')}</Text>
            <View style={styles.cameraActions}>
              <Pressable
                onPress={camera.stop}
                style={styles.secondaryBtn}
                disabled={loading}
              >
                <Text style={styles.secondaryBtnText}>{t(locale, 'result.back')}</Text>
              </Pressable>
              <Pressable
                onPress={snapAndClassify}
                style={[styles.snapBtn, (loading || camera.busy) && styles.btnDisabled]}
                disabled={loading || camera.busy}
                accessibilityLabel="Snap"
              >
                {loading || camera.busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <View style={styles.snapInner} />
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Pressable
              onPress={openCamera}
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>{t(locale, 'home.openCamera')}</Text>
            </Pressable>
            {camera.status === 'denied' ? (
              <Text style={styles.hint}>
                {t(locale, 'home.cameraDenied')}
                {'\n'}
                {t(locale, 'home.cameraDeniedHint')}
              </Text>
            ) : null}
            {/* Fallback copy always visible when camera UI is closed — text path remains available */}
            {camera.status !== 'active' && camera.status !== 'denied' ? (
              <Text style={styles.hint}>{t(locale, 'home.cameraUnavailableHint')}</Text>
            ) : null}
          </>
        )}
      </View>

      {/* Text identify path */}
      <View style={styles.card}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t(locale, 'home.placeholderProminent')}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          editable={!loading}
        />
        <Pressable
          onPress={submitText}
          disabled={loading || !text.trim()}
          style={[styles.primaryBtn, (loading || !text.trim()) && styles.btnDisabled]}
        >
          {loading && !camera.active ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>{t(locale, 'home.search')}</Text>
          )}
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <Pressable onPress={onBcrsEntry} style={styles.bcrsBtn}>
        <Text style={styles.bcrsBtnText}>{t(locale, 'bcrs.title')}</Text>
        <Text style={styles.bcrsSub}>{t(locale, 'bcrs.refundAmount')}</Text>
        <Text style={styles.bcrsSub}>{t(locale, 'bcrs.pointCount')}</Text>
      </Pressable>

      {/* Category identify path */}
      {categories.map((cat) => (
        <View key={cat.id} style={styles.catBlock}>
          <Pressable
            onPress={() =>
              setExpandedCategory((id) => (id === cat.id ? null : cat.id))
            }
            style={styles.catHeader}
          >
            <Text style={styles.catLabel}>
              {cat.icon} {cat.label}
            </Text>
            <Text style={styles.chevron}>
              {expandedCategory === cat.id ? '▾' : '▸'}
            </Text>
          </Pressable>
          {expandedCategory === cat.id
            ? cat.items.map((item) => (
                <Pressable
                  key={item.name}
                  onPress={() => onCategorySelect(item.result)}
                  style={styles.itemRow}
                >
                  <Text style={styles.itemName}>{item.name}</Text>
                </Pressable>
              ))
            : null}
        </View>
      ))}

      {history.length > 0 ? (
        <View style={styles.historyBlock}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>{t(locale, 'home.recent')}</Text>
            <Pressable onPress={onHistoryClear}>
              <Text style={styles.clearText}>{t(locale, 'home.clearHistory')}</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {history.map((h) => {
              const statusColor = STATUS_CONFIG[h.status]?.color ?? colors.textMuted;
              return (
                <Pressable
                  key={h.id}
                  onPress={() => onHistorySelect(h)}
                  style={[styles.historyChip, { borderColor: statusColor }]}
                >
                  <Text style={styles.historyChipText} numberOfLines={1}>
                    {h.item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      {/* App Store guideline 5.1.1: the privacy policy must be reachable in-app. */}
      <View style={styles.footer}>
        <Pressable
          style={styles.footerLink}
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          accessibilityRole="link"
        >
          <Text style={styles.footerLinkText}>{t(locale, 'home.privacy')}</Text>
        </Pressable>
        <Text style={styles.footerDivider}>·</Text>
        <Pressable
          style={styles.footerLink}
          onPress={() => void Linking.openURL(SUPPORT_URL)}
          accessibilityRole="link"
        >
          <Text style={styles.footerLinkText}>{t(locale, 'home.support')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logo: { fontSize: 24, fontWeight: '700', color: colors.neaGreen },
  localeRow: { flexDirection: 'row', gap: 6 },
  localeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  localeChipActive: {
    backgroundColor: colors.neaGreen,
    borderColor: colors.neaGreen,
  },
  localeText: { fontSize: 12, fontWeight: '600', color: colors.text },
  localeTextActive: { color: colors.white },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cameraWrap: { borderRadius: radii.card, overflow: 'hidden' },
  camera: { width: '100%', height: 320, backgroundColor: '#000' },
  cameraGuide: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    color: colors.white,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  snapBtn: {
    width: touch.snap,
    height: touch.snap,
    borderRadius: touch.snap / 2,
    backgroundColor: colors.neaGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#B8E6C8',
  },
  snapInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    padding: spacing.sm,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    minHeight: touch.minHeight,
    backgroundColor: colors.neaGreen,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    minHeight: touch.minHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  error: { color: colors.danger, marginTop: spacing.sm, fontSize: 14 },
  hint: { marginTop: spacing.sm, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  bcrsBtn: {
    backgroundColor: '#E8F8EF',
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#B8E6C8',
  },
  bcrsBtnText: { fontSize: 16, fontWeight: '700', color: '#065F46' },
  bcrsSub: { fontSize: 14, color: '#065F46', marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  catBlock: {
    backgroundColor: colors.white,
    borderRadius: radii.button,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  catHeader: {
    minHeight: touch.minHeight,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catLabel: { fontSize: 16, color: colors.text, fontWeight: '600' },
  chevron: { fontSize: 16, color: colors.textMuted },
  itemRow: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    justifyContent: 'center',
  },
  itemName: { fontSize: 15, color: colors.text },
  historyBlock: { marginTop: spacing.md },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearText: { color: colors.blueBin, fontSize: 14 },
  historyChip: {
    maxWidth: 140,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: colors.white,
    marginRight: 8,
  },
  historyChipText: { fontSize: 14, color: colors.text },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  footerLinkText: { color: colors.textMuted, fontSize: 14 },
  footerDivider: { color: colors.textMuted, fontSize: 14 },
});
