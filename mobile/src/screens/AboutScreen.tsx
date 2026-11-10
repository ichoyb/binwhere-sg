import * as Application from 'expo-application';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DATA_LICENSE_URL, PRIVACY_POLICY_URL, SUPPORT_EMAIL, SUPPORT_URL, t,
  type Locale, type TranslationKey,
} from '@binwhere/core';
import { GlassButton, GlassPanel } from '../components/Glass';
import { reportError } from '../lib/reporting';
import { dark } from '../theme/dark';

export function AboutScreen({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const openLink = (url: string) => {
    void Linking.openURL(url).catch((error) => reportError(error, { operation: 'open-about-link', url }));
  };
  const sources: TranslationKey[] = [
    'about.sourceRecycling', 'about.sourceReuse', 'about.sourceTextile', 'about.sourceBcrs', 'about.sourceOsm',
  ];

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <GlassPanel style={[styles.page, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">{t(locale, 'about.title')}</Text>
          <GlassButton label={t(locale, 'map.close')} onPress={onClose} style={styles.close}>
            <Text style={styles.body}>{t(locale, 'map.close')}</Text>
          </GlassButton>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.brand}>BinWhere</Text>
          <Text style={styles.caption}>{t(locale, 'about.version')} {Application.nativeApplicationVersion}
            {' · '}{t(locale, 'about.build')} {Application.nativeBuildVersion}</Text>
          <Text style={styles.body}>{t(locale, 'about.independent')}</Text>
          <Text style={styles.heading} accessibilityRole="header">{t(locale, 'about.dataSources')}</Text>
          {sources.map((key) => <Text key={key} style={styles.body}>{t(locale, key)}</Text>)}
          <Pressable accessibilityLabel={t(locale, 'map.dataLicense')} accessibilityRole="link"
            onPress={() => openLink(DATA_LICENSE_URL)} style={styles.link}>
            <Text style={styles.linkText}>{t(locale, 'map.dataLicense')} ↗</Text>
          </Pressable>
          <Text style={styles.heading} accessibilityRole="header">{t(locale, 'about.aiService')}</Text>
          <Text style={styles.body}>{t(locale, 'about.aiDescription')}</Text>
          <Text style={styles.heading} accessibilityRole="header">{t(locale, 'about.privacyAndSupport')}</Text>
          <Pressable accessibilityLabel={t(locale, 'home.privacy')} accessibilityRole="link"
            onPress={() => openLink(PRIVACY_POLICY_URL)} style={styles.link}>
            <Text style={styles.linkText}>{t(locale, 'home.privacy')} ↗</Text>
          </Pressable>
          <Pressable accessibilityLabel={t(locale, 'home.support')} accessibilityRole="link"
            onPress={() => openLink(SUPPORT_URL)} style={styles.link}>
            <Text style={styles.linkText}>{t(locale, 'home.support')} ↗</Text>
          </Pressable>
          <Text style={styles.caption}>{t(locale, 'about.contact')}</Text>
          <Pressable accessibilityLabel={`${t(locale, 'about.contact')} ${SUPPORT_EMAIL}`} accessibilityRole="link"
            onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)} style={styles.link}>
            <Text selectable style={styles.linkText}>{SUPPORT_EMAIL}</Text>
          </Pressable>
        </ScrollView>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: dark.background },
  page: { flex: 1, borderRadius: 0, borderWidth: 0 },
  header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, color: dark.text, fontSize: 24, fontWeight: '700' },
  close: { paddingHorizontal: 16 },
  content: { paddingHorizontal: 24, gap: 12 },
  brand: { color: dark.accent, fontSize: 32, fontWeight: '700', marginTop: 12 },
  heading: { color: dark.text, fontSize: 20, fontWeight: '700', marginTop: 16 },
  body: { color: dark.text, fontSize: dark.body, lineHeight: 25 },
  caption: { color: dark.muted, fontSize: dark.caption, lineHeight: 22 },
  link: { minHeight: dark.button, minWidth: dark.button, justifyContent: 'center' },
  linkText: { color: dark.accent, fontSize: dark.body, lineHeight: 25 },
});
