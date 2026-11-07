import type { CircleLayerSpecification, FilterSpecification, StyleSpecification } from '@maplibre/maplibre-react-native';
import type { PointsLayer } from '@binwhere/core';
import { mapAssets } from './assets';
import { pointTypes } from './points';

export const neighborhoodMinZoom = 14;

export const mapStyle: StyleSpecification = {
  version: 8,
  name: 'BinWhere',
  glyphs: mapAssets.glyphs,
  sprite: mapAssets.sprite,
  light: { anchor: 'viewport', color: '#d9e3ff', intensity: 0.75, position: [1.5, 250, 55] },
  transition: { duration: 0, delay: 0 },
  sources: {
    basemap: mapAssets.basemap,
    trees: mapAssets.trees,
    'country-mask': mapAssets.mask,
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#030b17',
      },
    },
    {
      id: 'land',
      type: 'fill',
      source: 'basemap',
      'source-layer': 'earth',
      paint: {
        'fill-color': '#102238',
        'fill-outline-color': '#2c536e',
      },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'basemap',
      'source-layer': 'water',
      paint: {
        'fill-color': '#030b17',
      },
    },
    {
      id: 'coast-halo',
      type: 'line',
      source: 'basemap',
      'source-layer': 'earth',
      filter: ['==', ['geometry-type'], 'Polygon'],
      maxzoom: 12,
      paint: {
        'line-color': '#4b9ec5',
        'line-width': 3,
        'line-blur': 2,
        'line-opacity': 0.3,
      },
    },
    {
      id: 'country-mask',
      type: 'fill',
      source: 'country-mask',
      maxzoom: 12,
      paint: {
        'fill-color': '#030b17',
      },
    },
    {
      id: 'park',
      type: 'fill',
      source: 'basemap',
      'source-layer': 'landuse',
      minzoom: 11,
      filter: [
        'in',
        'kind',
        'park',
        'forest',
        'nature_reserve',
        'wood',
        'grass',
        'grassland',
        'garden',
        'meadow',
        'village_green',
        'scrub',
      ],
      paint: {
        'fill-color': '#16362d',
        'fill-outline-color': '#204538',
      },
    },
    {
      id: 'roads',
      type: 'line',
      source: 'basemap',
      'source-layer': 'roads',
      minzoom: 12,
      paint: {
        'line-color': '#172538',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 18, 10],
      },
      filter: ['in', 'kind', 'highway', 'major_road', 'minor_road', 'path'],
    },
    {
      id: 'osm-trees',
      type: 'symbol',
      source: 'trees',
      minzoom: 15,
      layout: {
        'icon-image': 'tree',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 15, 0.3, 18, 0.8],
        'icon-pitch-alignment': 'map',
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
      },
      'source-layer': 'trees',
    },
    {
      id: 'road-major-glow',
      type: 'line',
      source: 'basemap',
      'source-layer': 'roads',
      minzoom: 12,
      filter: ['in', 'kind', 'highway', 'major_road'],
      paint: {
        'line-color': '#b3a47d',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 18, 13],
        'line-blur': 4,
        'line-opacity': 0.2,
      },
    },
    {
      id: 'road-major',
      type: 'line',
      source: 'basemap',
      'source-layer': 'roads',
      minzoom: 12,
      filter: ['in', 'kind', 'highway', 'major_road'],
      paint: {
        'line-color': '#56616b',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.4, 18, 2.3],
      },
    },
    {
      id: 'road-path',
      type: 'line',
      source: 'basemap',
      'source-layer': 'roads',
      minzoom: 15,
      filter: ['==', 'kind', 'path'],
      paint: {
        'line-color': '#46584d',
        'line-width': 0.7,
      },
    },
    {
      id: 'building-footprints',
      type: 'fill',
      source: 'basemap',
      'source-layer': 'buildings',
      minzoom: 14,
      filter: ['!=', ['geometry-type'], 'Point'],
      paint: {
        'fill-color': '#213a50',
        'fill-outline-color': '#344f64',
      },
    },
    {
      id: 'building-3d',
      type: 'fill-extrusion',
      source: 'basemap',
      'source-layer': 'buildings',
      minzoom: 14,
      filter: ['all', ['has', 'height'], ['>', ['get', 'height'], 0], ['!=', ['geometry-type'], 'Point']],
      paint: {
        'fill-extrusion-color': '#667889',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
        'fill-extrusion-opacity': 1,
        'fill-extrusion-vertical-gradient': true,
        'fill-extrusion-pattern': 'windows',
      },
    },
    {
      id: 'building-roof',
      type: 'fill-extrusion',
      source: 'basemap',
      'source-layer': 'buildings',
      minzoom: 14,
      filter: ['all', ['has', 'height'], ['>', ['get', 'height'], 0], ['!=', ['geometry-type'], 'Point']],
      paint: {
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'height'],
        'fill-extrusion-color': '#344557',
        'fill-extrusion-opacity': 1,
        'fill-extrusion-vertical-gradient': false,
      },
    },
    {
      id: 'road-names',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'roads',
      minzoom: 15,
      filter: ['has', 'name'],
      layout: {
        'symbol-placement': 'line',
        'text-field': ['get', 'name'],
        'text-font': [mapAssets.fontStack],
        'text-size': 12,
        'text-max-angle': 30,
        'text-padding': 8,
      },
      paint: {
        'text-color': '#a6b4c0',
        'text-halo-color': '#071321',
        'text-halo-width': 1.5,
      },
    },
  ],
};

export const pointColors: Record<PointsLayer, string> = {
  blue_bin: '#28b8ff',
  return_point: '#20ffc0',
  ewaste: '#ffbf55',
  textile: '#cd8cff',
  donation: '#ff83b5',
};

export function pointLayers(types: readonly PointsLayer[] = pointTypes): CircleLayerSpecification[] {
  const filter: FilterSpecification = ['in', ['get', 'type'], ['literal', types]];
  const [firstType, ...remainingTypes] = pointTypes;
  const color: NonNullable<CircleLayerSpecification['paint']>['circle-color'] = [
    'match', ['get', 'type'], firstType, pointColors[firstType],
    ...remainingTypes.flatMap((type) => [type, pointColors[type]]),
    '#ffffff',
  ];
  return [
    { id: 'point-glow', type: 'circle', source: 'points', filter,
      paint: { 'circle-radius': 3, 'circle-color': color, 'circle-blur': 0.85, 'circle-opacity': 0.17 } },
    { id: 'point-outer-glow', type: 'circle', source: 'points', filter,
      paint: { 'circle-radius': 6.5, 'circle-color': color, 'circle-blur': 1, 'circle-opacity': 0.08 } },
    { id: 'point-core', type: 'circle', source: 'points', filter,
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 0.7, 15, 3.4],
        'circle-color': color, 'circle-opacity': 0.95 } },
  ];
}
