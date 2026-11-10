import { parseEwasteDescription } from '../src/lib/ewaste';
import type { GeoJSONFeatureCollection } from '../src/lib/data-gov/shared/types';

export function convertEwasteData(source: GeoJSONFeatureCollection) {
  const features = source.features.filter(({ properties }) => (
    parseEwasteDescription(properties.DESCRIPTION as string, properties.OBJECTID).service !== 'collection_drive'
  ));
  return {
    geojson: { ...source, features },
    sourceRecordCount: source.features.length,
    excludedCollectionDriveCount: source.features.length - features.length,
  };
}
