/**
 * Build a Google Maps navigation URL.
 * Opens Google Maps app if installed, otherwise falls back to web.
 */
export function getNavigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
}
