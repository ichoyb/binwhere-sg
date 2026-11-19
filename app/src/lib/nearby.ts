import { EWASTE_ITEM_KINDS, DONATION_CATEGORIES, type NearbyQuery, type EwasteItemKind, type DonationItemKind } from '@binwhere/core';
import type { SpatialIndex } from './data-gov/geo/spatial-index';
import { parseEwasteDescription } from './ewaste';

export function queryNearby(index: SpatialIndex, input: NearbyQuery) {
  const ewasteItem = input.channel === 'ewaste' ? (input.itemKind ? EWASTE_ITEM_KINDS[input.itemKind as EwasteItemKind] : 'ict')
    : input.channel === 'ewaste_battery' ? 'battery'
      : input.channel === 'lighting' ? 'lamp' : undefined;
  const donationCategory = input.channel === 'donation' && input.itemKind
    ? DONATION_CATEGORIES[input.itemKind as DonationItemKind] : undefined;
  const acceptedItem = input.channel === 'donation' ? input.acceptedItem?.toLowerCase() : undefined;
  const results = index.queryRadius(
    { latitude: input.lat, longitude: input.lng },
    input.radius,
    ewasteItem || acceptedItem || donationCategory ? index.size : input.limit,
  );

  if (ewasteItem) {
    return results.filter(({ properties }) => (
      parseEwasteDescription(properties.DESCRIPTION as string, properties.OBJECTID).items.includes(ewasteItem)
    )).slice(0, input.limit);
  }
  if (donationCategory) {
    return results.filter(({ properties }) => (
      (properties.ACCEPTEDITEMS as string).split(',').map((category) => category.trim()).includes(donationCategory)
    )).slice(0, input.limit);
  }
  if (acceptedItem) {
    return results.filter(({ properties }) => (
      ((properties.ACCEPTEDITEMS as string) || '').toLowerCase().includes(acceptedItem)
    )).slice(0, input.limit);
  }
  return results;
}
