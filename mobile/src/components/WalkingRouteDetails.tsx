import { formatDistance, t, type Locale } from '@binwhere/core';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { useWalkingRoute } from '../hooks/useWalkingRoute';
import { dark } from '../theme/dark';
import { announce } from '../lib/accessibility';
import { walkingRouteText } from '../lib/accessibility-text';

export function WalkingRouteDetails({ locale, distanceKm, route, retry }: {
  locale: Locale;
  distanceKm: number;
  route: ReturnType<typeof useWalkingRoute>['route'];
  retry: () => void;
}) {
  const distance = route.kind === 'success'
    ? walkingRouteText(route.response, locale)
    : `${t(locale, 'map.straightLine')} · ${formatDistance(distanceKm)}`;
  const failureMessage = route.kind === 'failed'
    ? t(locale, route.failure.message).replace('{n}', String(route.failure.n)) : '';
  useEffect(() => {
    if (route.kind === 'success') announce(walkingRouteText(route.response, locale));
    if (route.kind === 'failed') announce(t(locale, route.failure.message).replace('{n}', String(route.failure.n)));
  }, [route, locale]);
  return <View style={styles.details}>
    <Text style={styles.distance} accessibilityRole="text" accessibilityLabel={distance}>{distance}</Text>
    {route.kind === 'failed' ? <>
      <Text style={styles.body} accessibilityRole="text"
        accessibilityLabel={failureMessage}>{failureMessage}</Text>
      {route.failure.retry ? <Pressable accessibilityRole="button" accessibilityLabel={t(locale, 'shared.tryAgain')}
        onPress={retry} style={styles.retry}><Text style={styles.retryText}>{t(locale, 'shared.tryAgain')}</Text></Pressable> : null}
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  details: { gap: 6 },
  distance: { color: dark.accent, fontSize: dark.caption, lineHeight: 20, fontWeight: '600' },
  body: { color: dark.text, fontSize: dark.body, lineHeight: 23 },
  retry: { minHeight: dark.button, justifyContent: 'center' },
  retryText: { color: dark.accent, fontSize: dark.body, fontWeight: '600' },
});
