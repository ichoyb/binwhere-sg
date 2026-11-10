import { t, type ApiV2ErrorCode, type Locale, type TranslationKey } from '@binwhere/core';

export function routeFailure(code: ApiV2ErrorCode | 'NETWORK_ERROR'): {
  message: TranslationKey; retry: boolean; report: boolean;
} {
  switch (code) {
    case 'ROUTE_NOT_ON_NETWORK': return { message: 'route.notOnNetwork', retry: false, report: false };
    case 'ROUTE_NOT_FOUND': return { message: 'route.notFound', retry: false, report: false };
    case 'RATE_LIMITED': return { message: 'error.tooMany', retry: true, report: false };
    case 'NETWORK_ERROR': return { message: 'error.networkError', retry: true, report: false };
    default: return { message: 'route.unavailable', retry: true, report: code === 'FORBIDDEN' || code === 'INVALID_INPUT' };
  }
}

export function routeDestinationGap(locale: Locale, name: string): string {
  return t(locale, 'route.destinationGap').replace('{name}', () => name);
}

export function routeMidpoint(coordinates: [number, number][]): [number, number] {
  const radians = Math.PI / 180;
  const lengths = coordinates.slice(1).map(([lng, lat], index) => {
    const [previousLng, previousLat] = coordinates[index];
    const a = Math.sin((lat - previousLat) * radians / 2) ** 2
      + Math.cos(previousLat * radians) * Math.cos(lat * radians)
      * Math.sin((lng - previousLng) * radians / 2) ** 2;
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  });
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
  let index = 0;
  while (index < lengths.length - 1 && remaining > lengths[index]) {
    remaining -= lengths[index];
    index++;
  }
  const fraction = lengths[index] === 0 ? 0 : remaining / lengths[index];
  return [
    coordinates[index][0] + (coordinates[index + 1][0] - coordinates[index][0]) * fraction,
    coordinates[index][1] + (coordinates[index + 1][1] - coordinates[index][1]) * fraction,
  ];
}
