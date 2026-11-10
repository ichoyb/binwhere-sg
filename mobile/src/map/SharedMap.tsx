import { createContext, useContext } from 'react';
import type { PointsLayer } from '@binwhere/core';
import type { MapCameraTarget } from './camera';
import type { MapLabels } from './MapLayers';
import type { FeatureCollection, LineString } from 'geojson';

export interface SharedMapValue {
  ready: boolean;
  reduceMotion: boolean;
  width: number;
  height: number;
  move: (target: MapCameraTarget, durationMs?: number) => Promise<void>;
  moveAndWait: (target: MapCameraTarget, durationMs?: number) => Promise<void>;
  setDestination: (data: MapLabels) => void;
  setRoute: (data: FeatureCollection<LineString>) => void;
  setDistance: (data: MapLabels) => void;
  setAnswerLayers: (layers: PointsLayer[] | null) => void;
}

export const SharedMapContext = createContext<SharedMapValue | null>(null);

export function useSharedMap(): SharedMapValue {
  const value = useContext(SharedMapContext);
  if (!value) throw new Error('Shared map is not mounted');
  return value;
}
