/**
 * Build a navigation URL that opens the appropriate maps app.
 * iOS → Apple Maps, everything else → Google Maps.
 */
export function getNavigationUrl(lat: number, lng: number, label?: string): string {
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    const q = label ? `&q=${encodeURIComponent(label)}` : '';
    return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w${q}`;
  }

  const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking&query=${q}`;
}
