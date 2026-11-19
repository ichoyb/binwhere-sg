import { useRef, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PLANNING_AREAS, t, type Locale, type PlanningArea } from '@binwhere/core';
import { GlassButton, GlassPanel } from './Glass';
import { dark } from '../theme/dark';
import { focusAccessibility } from '../lib/accessibility';

export function AreaPicker({ locale, onSelect, onClose, reduceMotion, visible, onDismiss }: {
  locale: Locale; reduceMotion: boolean; visible: boolean; onDismiss: () => void;
  onSelect: (area: PlanningArea) => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const title = useRef<ComponentRef<typeof Text>>(null);
  return <Modal visible={visible} animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose} onDismiss={onDismiss}
    onShow={() => focusAccessibility(title.current)}>
    <View style={styles.root} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <GlassPanel style={[styles.page, { paddingTop: insets.top }]}>
        <View style={[styles.header, fontScale > 1 && styles.scaledHeader]}>
          <Text ref={title} accessible accessibilityRole="header" style={[styles.title, fontScale > 1 && styles.scaledTitle]} maxFontSizeMultiplier={2}>{t(locale, 'location.chooseArea')}</Text>
          <GlassButton label={t(locale, 'map.close')} onPress={onClose} style={[styles.close, fontScale > 1 && styles.scaledClose]}>
            <Text style={styles.body}>{t(locale, 'map.close')}</Text>
          </GlassButton>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
          {PLANNING_AREAS.map((area) => <Pressable key={area.code} accessibilityRole="button"
            accessibilityLabel={area.names[locale] === area.names.en ? area.names[locale] : `${area.names[locale]}, ${area.names.en}`}
            onPress={() => onSelect(area)} style={styles.area}>
            <Text style={styles.body}>{area.names[locale]}</Text>
            {area.names[locale] !== area.names.en ? <Text style={styles.caption}>{area.names.en}</Text> : null}
          </Pressable>)}
        </ScrollView>
      </GlassPanel>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  scaledHeader: { flexDirection: 'column', alignItems: 'stretch' },
  scaledTitle: { flex: 0 },
  scaledClose: { maxWidth: '100%', width: '100%' },
  root: { flex: 1, backgroundColor: dark.background },
  page: { flex: 1, borderRadius: 0, borderWidth: 0 },
  header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, color: dark.text, fontSize: 24, fontWeight: '700' },
  close: { paddingHorizontal: 16, flexShrink: 1, maxWidth: '50%' },
  area: { minHeight: 52, paddingVertical: 12, justifyContent: 'center', gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dark.glassBorder },
  body: { color: dark.text, fontSize: dark.body, lineHeight: 25 },
  caption: { color: dark.muted, fontSize: dark.caption, lineHeight: 22 },
});
