import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { dark } from '../theme/dark';

export function GlassPanel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.panel, style]}>
      <BlurView tint="systemChromeMaterialDark" intensity={100} style={StyleSheet.absoluteFill} />
      <View style={styles.tint} pointerEvents="none" />
      {children}
    </View>
  );
}

export function GlassButton({ children, label, onPress, style, selected, disabled = false }: {
  children: ReactNode;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <GlassPanel style={style}>
      <Pressable accessibilityLabel={label} accessibilityRole="button"
        accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        {children}
      </Pressable>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: dark.radius, borderColor: dark.glassBorder, borderWidth: 1, overflow: 'hidden' },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: dark.glass },
  button: { minWidth: dark.button, minHeight: dark.button, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
});
