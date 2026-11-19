import * as Application from 'expo-application';
import { useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DATA_LICENSE_URL, OPEN_DATA_LICENCE_URL, PRIVACY_POLICY_URL, SUPPORT_EMAIL, SUPPORT_URL, t,
  type Locale, type TranslationKey,
} from '@binwhere/core';
import { GlassButton, GlassPanel } from '../components/Glass';
import { reportError } from '../lib/reporting';
import { openLink } from '../lib/open-link';
import { dark } from '../theme/dark';
import { focusAccessibility } from '../lib/accessibility';

export function AboutScreen({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const title = useRef<ComponentRef<typeof Text>>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => focusAccessibility(title.current));
    return () => cancelAnimationFrame(frame);
  }, []);
  const openAboutLink = (url: string) => {
    void openLink(url).catch((error) => reportError(error, { operation: 'open-about-link', url }));
  };
  const sources: TranslationKey[] = [
    'about.sourceReuse', 'about.sourceTextile', 'about.sourceBcrs', 'about.sourceOsm',
  ];

  return (
    <View style={styles.root} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <GlassPanel style={[styles.page, { paddingTop: insets.top }]}>
        <View style={[styles.header, fontScale > 1 && styles.scaledHeader]}>
          <Text ref={title} accessible style={[styles.title, fontScale > 1 && styles.scaledTitle]} accessibilityRole="header" maxFontSizeMultiplier={2}>{t(locale, 'about.title')}</Text>
          <GlassButton label={t(locale, 'map.close')} onPress={onClose} style={[styles.close, fontScale > 1 && styles.scaledClose]}>
            <Text style={styles.body}>{t(locale, 'map.close')}</Text>
          </GlassButton>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.brand} accessibilityRole="header" maxFontSizeMultiplier={2}>BinWhere</Text>
          <Text style={styles.caption}>{t(locale, 'about.version')} {Application.nativeApplicationVersion}
            {' · '}{t(locale, 'about.build')} {Application.nativeBuildVersion}</Text>
          <Text style={styles.body}>{t(locale, 'about.independent')}</Text>
          <Text style={styles.heading} accessibilityRole="header" maxFontSizeMultiplier={2}>{t(locale, 'about.dataSources')}</Text>
          <Text style={styles.body}>{t(locale, 'about.sourceRecycling')}</Text>
          <Text style={styles.body}>{t(locale, 'about.sourceAreas')}</Text>
          <Pressable accessibilityLabel={t(locale, 'about.openDataLicence')} accessibilityRole="link"
            onPress={() => openAboutLink(OPEN_DATA_LICENCE_URL)} style={styles.link}>
            <Text style={styles.linkText}>{t(locale, 'about.openDataLicence')} <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants">↗</Text></Text>
          </Pressable>
          {sources.map((key) => <Text key={key} style={styles.body}>{t(locale, key)}</Text>)}
          <Pressable accessibilityLabel={t(locale, 'map.dataLicense')} accessibilityRole="link"
            onPress={() => openAboutLink(DATA_LICENSE_URL)} style={styles.link}>
            <Text style={styles.linkText}>{t(locale, 'map.dataLicense')} <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants">↗</Text></Text>
          </Pressable>
          <Text style={styles.heading} accessibilityRole="header" maxFontSizeMultiplier={2}>{t(locale, 'about.aiService')}</Text>
          <Text style={styles.body}>{t(locale, 'about.aiDescription')}</Text>
          <Text style={styles.heading} accessibilityRole="header" maxFontSizeMultiplier={2}>{t(locale, 'about.privacyAndSupport')}</Text>
          <Pressable accessibilityLabel={t(locale, 'home.privacy')} accessibilityRole="link"
            onPress={() => openAboutLink(PRIVACY_POLICY_URL)} style={styles.link}>
            <Text style={styles.linkText}>{t(locale, 'home.privacy')} <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants">↗</Text></Text>
          </Pressable>
          <Pressable accessibilityLabel={t(locale, 'home.support')} accessibilityRole="link"
            onPress={() => openAboutLink(SUPPORT_URL)} style={styles.link}>
            <Text style={styles.linkText}>{t(locale, 'home.support')} <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants">↗</Text></Text>
          </Pressable>
          <Text style={styles.caption}>{t(locale, 'about.contact')}</Text>
          <Pressable accessibilityLabel={`${t(locale, 'about.contact')} ${SUPPORT_EMAIL}`} accessibilityRole="link"
            onPress={() => openAboutLink(`mailto:${SUPPORT_EMAIL}`)} style={styles.link}>
            <Text selectable style={styles.linkText}>{SUPPORT_EMAIL}</Text>
          </Pressable>
        </ScrollView>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  scaledHeader: { flexDirection: 'column', alignItems: 'stretch' },
  scaledTitle: { flex: 0 },
  scaledClose: { maxWidth: '100%', width: '100%' },
  root: { ...StyleSheet.absoluteFill, backgroundColor: dark.background },
  page: { flex: 1, borderRadius: 0, borderWidth: 0 },
  header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, color: dark.text, fontSize: 24, fontWeight: '700' },
  close: { paddingHorizontal: 16, flexShrink: 1, maxWidth: '50%' },
  content: { paddingHorizontal: 24, gap: 12 },
  brand: { color: dark.accent, fontSize: 32, fontWeight: '700', marginTop: 12 },
  heading: { color: dark.text, fontSize: 20, fontWeight: '700', marginTop: 16 },
  body: { color: dark.text, fontSize: dark.body, lineHeight: 25 },
  caption: { color: dark.muted, fontSize: dark.caption, lineHeight: 22 },
  link: { minHeight: dark.button, minWidth: dark.button, justifyContent: 'center' },
  linkText: { color: dark.accent, fontSize: dark.body, lineHeight: 25 },
});
