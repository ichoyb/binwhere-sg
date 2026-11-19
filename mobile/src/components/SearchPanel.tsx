import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator, Animated, Keyboard, PanResponder, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View, useWindowDimensions, type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getItemCategories, LOCALE_OPTIONS,
  MAX_CLASSIFY_TEXT_LENGTH, STATUS_CONFIG, t,
  type ClassifyResult, type Locale, type ScanHistoryItem,
} from '@binwhere/core';
import { classifyItem } from '../api/client';
import { getMobileError } from '../lib/api-error';
import { getItemSuggestions } from '../lib/item-suggestions';
import { useSharedMap } from '../map/SharedMap';
import { useAppState } from '../state/AppState';
import { dark } from '../theme/dark';
import { GlassButton, GlassPanel } from './Glass';
import { announce, focusAccessibility } from '../lib/accessibility';
import { languageOptionAccessibility } from '../lib/accessibility-text';

interface Props {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  history: ScanHistoryItem[];
  onHistorySelect: (item: ScanHistoryItem) => void;
  onHistoryClear: () => void;
  onClassified: (result: ClassifyResult, imageUri: string | null) => void;
  onCategorySelect: (result: ClassifyResult) => void;
  onBcrsEntry: () => void;
  onAbout: () => void;
  aboutOpen: boolean;
  onClose: () => void;
}

export function SearchPanel({ locale, onLocaleChange, history, onHistorySelect, onHistoryClear,
  onClassified, onCategorySelect, onBcrsEntry, onAbout, aboutOpen, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const { reduceMotion } = useSharedMap();
  const openingReduceMotion = useRef(reduceMotion).current;
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const input = useRef<TextInputInstance>(null);
  const aboutButton = useRef<ComponentRef<typeof Pressable>>(null);
  const wasAboutOpen = useRef(aboutOpen);
  const request = useRef<AbortController | null>(null);
  const closing = useRef(false);
  const translateY = useRef(new Animated.Value(openingReduceMotion ? 0 : height)).current;
  const { readGrantedLocation } = useAppState();
  const categories = useMemo(() => getItemCategories(locale), [locale]);
  const suggestions = useMemo(() => getItemSuggestions(text, locale), [text, locale]);

  useEffect(() => {
    if (wasAboutOpen.current && !aboutOpen) {
      const frame = requestAnimationFrame(() => focusAccessibility(aboutButton.current));
      wasAboutOpen.current = aboutOpen;
      return () => cancelAnimationFrame(frame);
    }
    wasAboutOpen.current = aboutOpen;
  }, [aboutOpen]);

  useEffect(() => { if (error) announce(error); }, [error]);

  useEffect(() => {
    const animation = Animated.timing(translateY, { toValue: 0, duration: openingReduceMotion ? 0 : 280, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) input.current?.focus(); });
    return () => { animation.stop(); request.current?.abort(); Keyboard.dismiss(); };
  }, [openingReduceMotion, translateY]);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardWillChangeFrame', (event) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardHeight(Math.max(0, height - event.endCoordinates.screenY));
    });
    const androidShown = Keyboard.addListener('keyboardDidShow', (event) => setKeyboardHeight(event.endCoordinates.height));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { shown.remove(); androidShown.remove(); hidden.remove(); };
  }, [height]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    request.current?.abort();
    Keyboard.dismiss();
    Animated.timing(translateY, { toValue: height, duration: reduceMotion ? 0 : 220, useNativeDriver: true })
      .start(({ finished }) => { if (finished) onClose(); });
  }, [height, onClose, reduceMotion, translateY]);

  const returnToRest = useCallback(() => {
    if (reduceMotion) translateY.setValue(0);
    else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
  }, [reduceMotion, translateY]);

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 80 || gesture.vy > 0.7) close();
      else returnToRest();
    },
    onPanResponderTerminate: returnToRest,
  }), [close, returnToRest, translateY]);

  const submit = async () => {
    const value = text.trim();
    if (!value || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    void readGrantedLocation();
    try {
      const result = await classifyItem({ text: value, locale }, controller.signal);
      if (controller.signal.aborted) return;
      setText('');
      Keyboard.dismiss();
      onClassified(result, null);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(getMobileError(caught, locale));
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setLoading(false);
      }
    }
  };
  const disabled = loading || !text.trim();
  const searchControls = (
    <>
      <View {...pan.panHandlers} style={styles.dragArea}>
        <View style={styles.handle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        <View style={[styles.header, fontScale > 1 && styles.scaledRow]}>
          <Text style={[styles.title, fontScale > 1 && styles.scaledItem]} accessibilityRole="header" maxFontSizeMultiplier={2}>{t(locale, 'map.searchItems')}</Text>
          <GlassButton label={t(locale, 'map.close')} onPress={close} style={[styles.close, fontScale > 1 && styles.scaledClose]}>
            <Text style={styles.body}>{t(locale, 'map.close')}</Text>
          </GlassButton>
        </View>
      </View>
      <View style={[styles.searchBox, fontScale > 1 && styles.scaledRow]}>
        <TextInput ref={input} value={text}
          onChangeText={(value) => setText(value.replace(/\r\n|[\r\n\v\f\u0085\u2028\u2029]/g, ' '))}
          accessibilityLabel={t(locale, 'map.searchItems')} accessibilityRole="search"
          placeholder={t(locale, 'search.placeholder')} placeholderTextColor={dark.muted}
          style={[styles.input, { maxHeight: height * 0.2 }, fontScale > 1 && styles.scaledItem]} multiline submitBehavior="blurAndSubmit"
          maxLength={MAX_CLASSIFY_TEXT_LENGTH} editable={!loading}
          returnKeyType="search" onSubmitEditing={() => void submit()} autoCorrect={false}
          selectionColor={dark.accent} keyboardAppearance="dark" />
        <Pressable accessibilityLabel={t(locale, 'home.search')} accessibilityRole="button"
          accessibilityState={{ disabled, busy: loading }} disabled={disabled} onPress={() => void submit()}
          style={[styles.submit, disabled && styles.disabled, fontScale > 1 && styles.scaledItem]}>
          {loading ? <ActivityIndicator color={dark.onAccent} accessibilityLabel={t(locale, 'loading.identifying')} />
            : <Text style={styles.submitText}>{t(locale, 'home.search')}</Text>}
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal onAccessibilityEscape={close}>
      <Animated.View style={[styles.sheet, { top: insets.top + 76, bottom: keyboardHeight,
        transform: [{ translateY }] }]}>
        <GlassPanel style={styles.panel}>
          {fontScale <= 1 ? searchControls : null}
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
            contentContainerStyle={[styles.content, { paddingBottom: keyboardHeight ? 16 : insets.bottom + 16 }]}>
            {fontScale > 1 ? <View style={styles.scaledControls}>{searchControls}</View> : null}
            {text.trim() ? <>
              {suggestions.length > 0 ? <Text style={styles.sectionTitle} accessibilityRole="header">
                {t(locale, 'search.suggestions')}</Text> : null}
              {suggestions.map((item) => (
                <Pressable key={`${item.categoryId}:${item.name}`} accessibilityLabel={`${item.name}, ${item.categoryLabel}`}
                  accessibilityRole="button" onPress={() => { Keyboard.dismiss(); onCategorySelect(item.result); }}
                  style={styles.itemRow}>
                  <Text style={styles.body}>{item.name}</Text>
                  <Text style={styles.caption}><Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{item.icon} </Text>{item.categoryLabel}</Text>
                </Pressable>
              ))}
            </> : <>
              {history.length > 0 ? <View>
                <View style={[styles.sectionHeader, fontScale > 1 && styles.scaledRow]}>
                  <Text style={styles.sectionTitle} accessibilityRole="header">{t(locale, 'home.recent')}</Text>
                  <Pressable accessibilityLabel={t(locale, 'home.clearHistory')} accessibilityRole="button"
                    onPress={onHistoryClear} style={[styles.clear, fontScale > 1 && styles.scaledClear]} hitSlop={{ top: 8, bottom: 8 }}>
                    <Text style={styles.linkText}>{t(locale, 'home.clearHistory')}</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {history.map((item) => (
                    <Pressable key={item.id} accessibilityLabel={`${item.item}, ${t(locale, `status.${item.status}`)}`}
                      accessibilityRole="button" onPress={() => { Keyboard.dismiss(); onHistorySelect(item); }}
                      style={[styles.historyChip, { borderColor: STATUS_CONFIG[item.status].color }]}>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_CONFIG[item.status].color }]}
                        accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                      <Text style={[styles.body, { flexShrink: 1 }]} numberOfLines={1}>{item.item}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View> : null}
              <GlassButton label={`${t(locale, 'bcrs.title')}, ${t(locale, 'bcrs.refundAmount')}, ${t(locale, 'bcrs.pointCount')}`}
                onPress={() => { Keyboard.dismiss(); onBcrsEntry(); }}
                style={styles.bcrs}>
                <View style={styles.bcrsContent}>
                  <Text style={styles.bcrsTitle}>{t(locale, 'bcrs.title')}</Text>
                  <Text style={styles.caption}>{t(locale, 'bcrs.refundAmount')}</Text>
                  <Text style={styles.caption}>{t(locale, 'bcrs.pointCount')}</Text>
                </View>
              </GlassButton>
              <Text style={styles.sectionTitle} accessibilityRole="header">{t(locale, 'search.browseCategories')}</Text>
              {categories.map((category) => <View key={category.id} style={styles.category}>
                <Pressable accessibilityLabel={category.label} accessibilityRole="button"
                  accessibilityState={{ expanded: expandedCategory === category.id }}
                  onPress={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                  style={[styles.categoryHeader, fontScale > 1 && styles.scaledRow]}>
                  <Text style={[styles.body, styles.categoryName, fontScale > 1 && styles.scaledItem]}><Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{category.icon} </Text>{category.label}</Text>
                  <Text style={styles.caption} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{expandedCategory === category.id ? '−' : '+'}</Text>
                </Pressable>
                {expandedCategory === category.id ? category.items.map((item) => (
                  <Pressable key={item.name} accessibilityLabel={item.name} accessibilityRole="button"
                    onPress={() => { Keyboard.dismiss(); onCategorySelect(item.result); }} style={styles.itemRow}>
                    <Text style={styles.body}>{item.name}</Text>
                  </Pressable>
                )) : null}
              </View>)}
              <View style={[styles.footer, fontScale > 1 && styles.scaledRow]}>
                <Pressable accessibilityLabel={`${t(locale, 'search.language')}, ${LOCALE_OPTIONS.find((option) => option.value === locale)!.native}`} accessibilityRole="button"
                  accessibilityState={{ expanded: languagesOpen }} onPress={() => setLanguagesOpen(!languagesOpen)}
                  style={[styles.footerLink, fontScale > 1 && styles.scaledItem]}>
                  <Text style={styles.linkText}>{t(locale, 'search.language')}</Text>
                  <Text style={styles.caption}>{LOCALE_OPTIONS.find((option) => option.value === locale)!.native}</Text>
                </Pressable>
                <Pressable ref={aboutButton} accessibilityLabel={t(locale, 'about.title')} accessibilityRole="button"
                  onPress={() => { Keyboard.dismiss(); onAbout(); }} style={[styles.footerLink, fontScale > 1 && styles.scaledItem]}>
                  <Text style={styles.linkText}>{t(locale, 'about.title')} <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants">›</Text></Text>
                </Pressable>
              </View>
              {languagesOpen ? <View style={styles.languages}>
                {LOCALE_OPTIONS.map((option) => <Pressable key={option.value}
                  {...languageOptionAccessibility(option)} accessibilityRole="button"
                  accessibilityState={{ selected: locale === option.value }} onPress={() => onLocaleChange(option.value)}
                  style={[styles.language, locale === option.value && styles.languageSelected]}>
                  <Text style={styles.body}><Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{locale === option.value ? '✓ ' : ''}</Text>{option.native}</Text>
                </Pressable>)}
              </View> : null}
            </>}
          </ScrollView>
        </GlassPanel>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scaledRow: { flexDirection: 'column', alignItems: 'stretch' },
  scaledItem: { flex: 0, width: '100%' },
  scaledClose: { maxWidth: '100%', width: '100%' },
  scaledClear: { width: '100%', alignItems: 'flex-start' },
  sheet: { position: 'absolute', left: 0, right: 0 },
  panel: { flex: 1, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dragArea: { paddingTop: 10, paddingHorizontal: 20 },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: dark.muted, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  title: { color: dark.text, fontSize: 22, fontWeight: '700', flex: 1 },
  close: { paddingHorizontal: 14, flexShrink: 1, maxWidth: '50%' },
  searchBox: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginBottom: 12 },
  input: { flex: 1, minWidth: 52, minHeight: dark.button, borderWidth: 1, borderColor: dark.glassBorder, borderRadius: 16,
    color: dark.text, fontSize: dark.body, paddingHorizontal: 12, paddingVertical: 15 },
  submit: { minHeight: dark.button, minWidth: dark.button, flexShrink: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 16, borderRadius: 16, backgroundColor: dark.accent },
  submitText: { color: dark.onAccent, fontSize: dark.body, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  error: { color: dark.text, fontSize: dark.caption, lineHeight: 21, marginHorizontal: 20, marginBottom: 12 },
  content: { paddingHorizontal: 20, gap: 12 },
  scaledControls: { marginHorizontal: -20 },
  body: { color: dark.text, fontSize: dark.body, lineHeight: 23 },
  caption: { color: dark.muted, fontSize: dark.caption, lineHeight: 21 },
  sectionTitle: { color: dark.text, fontSize: dark.body, fontWeight: '700', marginVertical: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: dark.button },
  clear: { minWidth: dark.button, minHeight: 36, justifyContent: 'center', alignItems: 'flex-end' },
  linkText: { color: dark.accent, fontSize: dark.body, lineHeight: 23 },
  historyChip: { minHeight: dark.button, maxWidth: 240, marginRight: 8, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 18 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  bcrs: { borderRadius: 20, marginTop: 4 },
  bcrsContent: { padding: 16, alignSelf: 'stretch', gap: 6 },
  bcrsTitle: { color: dark.accent, fontSize: dark.body, fontWeight: '700' },
  category: { borderWidth: 1, borderColor: dark.glassBorder, borderRadius: 16, overflow: 'hidden' },
  categoryHeader: { minHeight: dark.button, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryName: { flex: 1 },
  itemRow: { minHeight: dark.button, paddingHorizontal: 14, paddingVertical: 12,
    justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dark.glassBorder, gap: 4 },
  footer: { flexDirection: 'row', gap: 16, marginTop: 8 },
  footerLink: { flex: 1, minWidth: dark.button, minHeight: dark.button, justifyContent: 'center', gap: 4 },
  languages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  language: { maxWidth: '100%', minWidth: dark.button, minHeight: dark.button, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1, borderColor: dark.glassBorder, justifyContent: 'center' },
  languageSelected: { borderColor: dark.accent, backgroundColor: dark.accentSoft },
});
