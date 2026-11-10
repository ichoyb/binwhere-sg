import type { NearbyQuery } from '@binwhere/core';
import type { SpatialIndex } from './data-gov/geo/spatial-index';
import { parseEwasteDescription } from './ewaste';

export function queryNearby(index: SpatialIndex, input: NearbyQuery) {
  const ewasteItem = input.channel === 'ewaste' ? 'ict'
    : input.channel === 'ewaste_battery' ? 'battery'
      : input.channel === 'lighting' ? 'lamp' : undefined;
  const acceptedItem = input.channel === 'donation' ? input.acceptedItem?.toLowerCase() : undefined;
  const results = index.queryRadius(
    { latitude: input.lat, longitude: input.lng },
    input.radius,
    ewasteItem || acceptedItem ? index.size : input.limit,
  );

  if (ewasteItem) {
    return results.filter(({ properties }) => (
      parseEwasteDescription(properties.DESCRIPTION as string, properties.OBJECTID).items.includes(ewasteItem)
    )).slice(0, input.limit);
  }
  if (acceptedItem) {
    return results.filter(({ properties }) => (
      ((properties.ACCEPTEDITEMS as string) || '').toLowerCase().includes(acceptedItem)
    )).slice(0, input.limit);
  }
  return results;
}
