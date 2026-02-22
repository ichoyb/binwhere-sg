/** Latitude/longitude pair */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Axis-aligned bounding box */
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Feature with computed distance */
export interface FeatureWithDistance {
  properties: Record<string, unknown>;
  coordinates: Coordinates;
  distanceKm: number;
}
