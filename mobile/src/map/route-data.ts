import { formatDistance, type RouteResponse } from '@binwhere/core';
import type { FeatureCollection, LineString } from 'geojson';
import type { MapLabels } from './MapLayers';
import { routeMidpoint } from '../lib/walking-route';

export function routeMapData(response: RouteResponse): { route: FeatureCollection<LineString>; distance: MapLabels } {
  return {
    route: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: response.geometry, properties: {} }] },
    distance: { type: 'FeatureCollection', features: [{ type: 'Feature',
      geometry: { type: 'Point', coordinates: routeMidpoint(response.geometry.coordinates) },
      properties: { label: formatDistance(response.distanceM / 1000) } }] },
  };
}
