import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { t, type Locale } from '@binwhere/core';
import { recognitionProgress } from '../lib/recognition-progress';
import { dark } from '../theme/dark';

export function RecognitionRing({ locale }: { locale: Locale }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => setProgress(recognitionProgress(performance.now() - start)), 80);
    return () => clearInterval(timer);
  }, []);
  return (
    <View accessible style={styles.ring} accessibilityState={{ busy: true }} accessibilityRole="progressbar" accessibilityLabel={t(locale, 'loading.identifying')}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
      {Array.from({ length: 72 }, (_, index) => {
        const angle = index * Math.PI * 2 / 72;
        return <View key={index} style={[styles.segment, {
          left: 34 + 33 * Math.sin(angle), top: 34 - 33 * Math.cos(angle),
          backgroundColor: index / 72 < progress ? dark.accent : 'rgba(245,248,255,0.24)',
          transform: [{ rotate: `${index * 5}deg` }],
        }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { width: 72, height: 72 },
  segment: { position: 'absolute', width: 4, height: 6, borderRadius: 2 },
});
