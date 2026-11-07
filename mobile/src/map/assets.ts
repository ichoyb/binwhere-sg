export const mapAssets = {
  minZoom: 9,
  maxZoom: 15,
  fontStack: 'Noto Sans Regular',
  initialStyle: 'asset://map-assets/initial-style.json',
  basemap: {
    type: 'vector',
    url: 'pmtiles://asset://map-assets/basemap.pmtiles',
    attribution: '© OpenStreetMap contributors',
  },
  trees: {
    type: 'vector',
    url: 'pmtiles://asset://map-assets/trees.pmtiles',
    attribution: '© OpenStreetMap contributors',
  },
  mask: {
    type: 'geojson',
    data: 'asset://map-assets/country-mask.geojson',
  },
  glyphs: 'asset://map-assets/fonts/{fontstack}/{range}.pbf',
  sprite: 'asset://map-assets/sprite',
} as const;
