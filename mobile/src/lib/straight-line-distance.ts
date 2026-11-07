import type { UserLocation } from '../hooks/useGeolocation';

export function straightLineKm(origin: UserLocation, destination: readonly number[]): number {
  const [lng, lat] = destination;
  const radians = Math.PI / 180;
  const a = Math.sin((lat - origin.lat) * radians / 2) ** 2
    + Math.cos(origin.lat * radians) * Math.cos(lat * radians)
    * Math.sin((lng - origin.lng) * radians / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
