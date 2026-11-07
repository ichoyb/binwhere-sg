import {
  mapItemToAcceptedItem,
  type ClassifyResult, type NearbyChannel, type NearbyPoint, type PointsLayer,
} from '@binwhere/core';
import { fetchNearby } from '../api/client';
import type { UserLocation } from '../hooks/useGeolocation';

export interface DestinationQuery {
  channel: NearbyChannel;
  acceptedItem?: string;
}

export function automaticDestination(result: ClassifyResult): DestinationQuery | null {
  switch (result.channel) {
    case 'return_point':
    case 'ewaste':
    case 'ewaste_battery':
    case 'lighting':
    case 'textile':
      return { channel: result.channel };
    case 'donation': {
      const acceptedItem = mapItemToAcceptedItem(result.item);
      return { channel: 'donation', ...(acceptedItem ? { acceptedItem } : {}) };
    }
    case 'bulky_waste':
      return { channel: 'donation', acceptedItem: 'Furniture' };
    default:
      return null;
  }
}

export function optionalDestination(result: ClassifyResult): DestinationQuery | null {
  if (result.channel === 'blue_bin') return { channel: 'blue_bin' };
  if (result.next_action?.type === 'check_container_type') return { channel: 'return_point' };
  return null;
}

export function destinationLayers(query: DestinationQuery): PointsLayer[] {
  switch (query.channel) {
    case 'blue_bin':
    case 'return_point':
    case 'ewaste':
    case 'textile':
      return [query.channel];
    case 'donation':
      return query.acceptedItem ? [] : ['donation'];
    case 'ewaste_battery':
    case 'lighting':
      return [];
  }
}

export async function findDestination(
  query: DestinationQuery,
  location: UserLocation,
): Promise<NearbyPoint | null> {
  const params = { ...query, ...location, limit: 1 };
  const local = await fetchNearby({ ...params, radius: 1 });
  if (local.results.length) return local.results[0];
  const wider = await fetchNearby({ ...params, radius: 5 });
  return wider.results[0] ?? null;
}
