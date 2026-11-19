import {
  getResultDestinationQuery, type ResultDestinationQuery,
  type ClassifyResult, type NearbyPoint, type PointsLayer,
} from '@binwhere/core';
import { fetchNearby } from '../api/client';
import type { UserLocation } from '../hooks/useGeolocation';

export type DestinationQuery = ResultDestinationQuery;

export function automaticDestination(result: ClassifyResult): DestinationQuery | null {
  if (result.channel === 'blue_bin' || result.channel === null) return null;
  return getResultDestinationQuery(result);
}

export function answerInitiallyExpanded(result: ClassifyResult): boolean {
  return automaticDestination(result) === null;
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
    case 'textile':
      return [query.channel];
    case 'donation':
      return query.itemKind ? [] : ['donation'];
    case 'ewaste':
    case 'ewaste_battery':
    case 'lighting':
      return [];
  }
}

export async function findDestination(
  query: DestinationQuery,
  location: UserLocation,
  signal?: AbortSignal,
): Promise<NearbyPoint | null> {
  const params = { ...query, ...location, limit: 1 };
  const local = await fetchNearby({ ...params, radius: 1 }, signal);
  if (local.results.length) return local.results[0];
  const wider = await fetchNearby({ ...params, radius: 5 }, signal);
  return wider.results[0] ?? null;
}
