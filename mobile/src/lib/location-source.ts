import { getPlanningArea, isSingaporeCoordinates, type PlanningArea, type TranslationKey } from '@binwhere/core';

export interface Coordinates { lat: number; lng: number }
export type LocationSelection =
  | { locationSource: 'device' }
  | { locationSource: 'manual'; area: PlanningArea };
export type LocationFailure = 'denied' | 'unavailable' | 'outside';
export type ResolvedLocation =
  | { kind: 'device'; location: Coordinates }
  | { kind: 'manual'; location: Coordinates; area: PlanningArea }
  | { kind: 'failed'; reason: LocationFailure };

export const LOCATION_AREA_KEY = 'binwhere.location-area.v1';

export function parseStoredArea(raw: string | null):
  | { kind: 'valid'; area: PlanningArea }
  | { kind: 'absent' | 'invalid' } {
  if (raw === null) return { kind: 'absent' };
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { kind: 'invalid' }; }
  if (typeof value !== 'object' || value === null || !('code' in value) || typeof value.code !== 'string') {
    return { kind: 'invalid' };
  }
  const area = getPlanningArea(value.code);
  return area ? { kind: 'valid', area } : { kind: 'invalid' };
}

export function resolveLocationResult(
  selection: LocationSelection,
  permission: 'granted' | 'denied' | 'undetermined' | null,
  location: Coordinates | null,
): ResolvedLocation {
  if (selection.locationSource === 'manual') {
    const { area } = selection;
    return { kind: 'manual', area, location: { lat: area.lat, lng: area.lng } };
  }
  if (permission === 'denied') return { kind: 'failed', reason: 'denied' };
  if (permission !== 'granted' || location === null) return { kind: 'failed', reason: 'unavailable' };
  return isSingaporeCoordinates(location.lat, location.lng)
    ? { kind: 'device', location } : { kind: 'failed', reason: 'outside' };
}

export function sameLocationSelection(a: LocationSelection, b: LocationSelection): boolean {
  return a.locationSource === b.locationSource
    && (a.locationSource === 'device' || (b.locationSource === 'manual' && a.area.code === b.area.code));
}

export function locationFailureNotice(reason: LocationFailure): {
  message: TranslationKey; actions: readonly ('settings' | 'retry' | 'area')[];
} {
  switch (reason) {
    case 'denied': return { message: 'map.locationDenied', actions: ['settings', 'area'] };
    case 'unavailable': return { message: 'map.locationUnavailable', actions: ['retry', 'area'] };
    case 'outside': return { message: 'map.locationOutsideSingapore', actions: ['area'] };
  }
}
