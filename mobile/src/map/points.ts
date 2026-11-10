import { PointsLayerSchema, type EwasteAccept, type PointsLayer, type PointsResponse } from '@binwhere/core';
import type { FeatureCollection, Point } from 'geojson';

export const pointTypes = PointsLayerSchema.options;

export type MapPoints = FeatureCollection<Point, {
  type: PointsLayer;
  name: string;
  address: string;
  dataVersion: string;
  ewasteAccepts?: EwasteAccept[];
}>;

export function pointsToGeoJSON(response: PointsResponse): MapPoints {
  return {
    type: 'FeatureCollection',
    features: pointTypes.flatMap((type) => response.layers[type].map(
      ([latitude, longitude, name, address], index) => ({
        type: 'Feature' as const,
        id: `${type}:${index}`,
        geometry: { type: 'Point' as const, coordinates: [longitude, latitude] },
        properties: {
          type, name, address, dataVersion: response.dataVersion,
          ...(type === 'ewaste' && response.ewasteAccepts !== undefined
            ? { ewasteAccepts: response.ewasteAccepts[index] } : {}),
        },
      }),
    )),
  };
}
