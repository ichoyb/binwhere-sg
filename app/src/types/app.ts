import type { ClassifyResult } from '@/lib/ai/types';

export type AppView = 'home' | 'result' | 'nearby';

export interface ScanHistoryItem {
  id: string;
  item: string;
  status: ClassifyResult['status'];
  channel: ClassifyResult['channel'];
  timestamp: number;
  /** Full classification result for re-display when tapped */
  result?: ClassifyResult;
}

export interface NearbyPoint {
  name: string;
  address: string;
  postalCode: string;
  distanceKm: number;
  lat: number;
  lng: number;
}

export interface NearbyResponse {
  channel: string;
  center: { lat: number; lng: number };
  radiusKm: number;
  count: number;
  results: NearbyPoint[];
}
