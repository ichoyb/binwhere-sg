import { formatDistance, t, type Locale } from '@binwhere/core';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { useWalkingRoute } from '../hooks/useWalkingRoute';
import { routeDestinationGap } from '../lib/walking-route';
import { dark } from '../theme/dark';

export function WalkingRouteDetails({ locale, name, distanceKm, route, retry }: {
  locale: Locale;
  name: string;
  distanceKm: number;
  route: ReturnType<typeof useWalkingRoute>['route'];
  retry: () => void;
}) {
  const distance = route.kind === 'success'
    ? `${formatDistance(route.response.distanceM / 1000)} · ~${Math.max(1, Math.ceil(route.response.durationS / 60))} ${t(locale, 'shared.walk')}`
    : `${t(locale, 'map.straightLine')} · ${formatDistance(distanceKm)}`;
  const gap = routeDestinationGap(locale, name);
  return <View style={styles.details}>
    <Text style={styles.distance} accessibilityRole="text" accessibilityLabel={distance}
      accessibilityLiveRegion="polite">{distance}</Text>
    {route.kind === 'success' && route.response.snappedDestination.offsetM > 15 ?
      <Text style={styles.body} accessibilityRole="text"
        accessibilityLabel={gap}>{gap}</Text> : null}
    {route.kind === 'failed' ? <>
      <Text style={styles.body} accessibilityRole="text"
        accessibilityLabel={t(locale, route.failure.message)}>{t(locale, route.failure.message)}</Text>
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
