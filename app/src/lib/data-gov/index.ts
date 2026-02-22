// data-gov module barrel export

// API clients (build-time use)
export { HttpClient, type HttpClientOptions } from './api/http-client';
export { DatasetClient } from './api/dataset-client';

// Geo
export { SpatialIndex } from './geo/spatial-index';
export { haversineDistance } from './geo/haversine';
export type { Coordinates, FeatureWithDistance, BoundingBox } from './geo/types';

// Runtime singletons
export { getSpatialIndex, getBlueBinIndex, getEwasteIndex } from './singleton';

// Constants
export { DATASET_IDS, SG_BOUNDS, SPATIAL } from './shared/constants';

// Types
export type { GeoJSONFeature, GeoJSONFeatureCollection } from './shared/types';

// Errors
export {
  DataGovError,
  HttpError,
  DatasetError,
  ValidationError,
  CoordinateError,
  RadiusError,
} from './shared/errors';
