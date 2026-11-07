import type { PointsLayer } from '@binwhere/core';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { useMemo } from 'react';
import { DestinationPulse } from './DestinationPulse';
import { mapAssets } from './assets';
import type { MapPoints } from './points';
import { neighborhoodMinZoom, pointLayers } from './style';

export const emptyMapData: FeatureCollection<never, never> = { type: 'FeatureCollection', features: [] };
export type MapLabels = FeatureCollection<Point, { label: string }>;

export interface MapLayersProps {
  points?: MapPoints;
  visiblePointTypes?: readonly PointsLayer[];
  route?: FeatureCollection<LineString>;
  destination?: MapLabels;
  user?: MapLabels;
  distance?: MapLabels;
  neighborhood: boolean;
  reduceMotion: boolean;
}

export function MapLayers({
  points = emptyMapData, visiblePointTypes, route = emptyMapData,
  destination = emptyMapData, user = emptyMapData, distance = emptyMapData,
  neighborhood, reduceMotion,
}: MapLayersProps) {
  const layers = useMemo(() => pointLayers(visiblePointTypes), [visiblePointTypes]);
  const labelLayout = {
    'text-field': ['get', 'label'] as ['get', string], 'text-font': [mapAssets.fontStack],
    'text-size': 14, 'text-offset': [0.8, 1.6] as [number, number],
    'text-anchor': 'left' as const, 'text-allow-overlap': true,
  };
  const labelPaint = { 'text-color': '#e5fff2', 'text-halo-color': '#04101d', 'text-halo-width': 1.5 };
  return (
    <>
      <GeoJSONSource id="points" data={points} cluster={false} maxzoom={18} tolerance={0}>
        {layers.map((layer) => <Layer key={layer.id} {...layer} />)}
      </GeoJSONSource>
      <GeoJSONSource id="route" data={route} tolerance={0}>
        <Layer id="route-glow" type="line" minzoom={neighborhoodMinZoom}
          paint={{ 'line-color': '#20ffc0', 'line-width': 16, 'line-opacity': 0.35, 'line-blur': 8 }} />
        <Layer id="route-line" type="line" minzoom={neighborhoodMinZoom}
          paint={{ 'line-color': '#b0ffdc', 'line-width': 3 }} />
      </GeoJSONSource>
      <GeoJSONSource id="destination" data={destination}>
        <DestinationPulse enabled={neighborhood && destination.features.length > 0} reduceMotion={reduceMotion} />
        <Layer id="destination-icon" type="symbol" minzoom={neighborhoodMinZoom}
          layout={{ 'icon-image': 'destination', 'icon-allow-overlap': true }} />
        <Layer id="destination-label" type="symbol" minzoom={neighborhoodMinZoom}
          layout={labelLayout} paint={labelPaint} />
      </GeoJSONSource>
      <GeoJSONSource id="user" data={user}>
        <Layer id="user-icon" type="symbol"
          layout={{ 'icon-image': 'user', 'icon-allow-overlap': true }} />
        <Layer id="user-label" type="symbol" minzoom={neighborhoodMinZoom}
          layout={labelLayout} paint={labelPaint} />
      </GeoJSONSource>
      <GeoJSONSource id="distance" data={distance}>
        <Layer id="distance-bubble" type="symbol" minzoom={neighborhoodMinZoom}
          layout={{ 'text-field': ['get', 'label'], 'text-font': [mapAssets.fontStack], 'text-size': 14,
            'text-allow-overlap': true, 'icon-image': 'bubble', 'icon-text-fit': 'both',
            'icon-text-fit-padding': [5, 9, 5, 9], 'icon-allow-overlap': true }}
          paint={{ 'text-color': '#e1ffea' }} />
      </GeoJSONSource>
    </>
  );
}
