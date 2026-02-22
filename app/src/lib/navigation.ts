/**
 * Build a Google Maps navigation URL that works on iOS, Android, and desktop.
 */
export function getNavigationUrl(lat: number, lng: number, label?: string): string {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=walking&query=${q}`;
}
