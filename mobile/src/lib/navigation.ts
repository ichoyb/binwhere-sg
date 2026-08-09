import { Linking, Platform } from 'react-native';

/** Open walking directions in Apple Maps (iOS) or Google Maps (Android). */
export async function openWalkingDirections(lat: number, lng: number): Promise<void> {
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;

  const can = await Linking.canOpenURL(url);
  if (!can) {
    throw new Error('Cannot open maps');
  }
  await Linking.openURL(url);
}
