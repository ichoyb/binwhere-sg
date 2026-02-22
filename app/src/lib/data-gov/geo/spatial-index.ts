import { SPATIAL } from '../shared/constants';
import { haversineDistance } from './haversine';
import type { Coordinates, FeatureWithDistance, BoundingBox } from './types';
import type { GeoJSONFeature } from '../shared/types';

interface IndexedPoint {
  coordinates: Coordinates;
  properties: Record<string, unknown>;
}

/**
 * Grid-based spatial index for fast proximity queries.
 * Grid cell size: ~0.01 deg = 1.1km. Max search radius: 5km.
 */
export class SpatialIndex {
  private grid = new Map<string, IndexedPoint[]>();
  private pointCount = 0;

  /** Build index from GeoJSON features */
  buildFromFeatures(features: GeoJSONFeature[]): void {
    this.grid.clear();
    this.pointCount = 0;

    for (const feature of features) {
      const coords = this.extractCoordinates(feature);
      if (!coords) continue;

      const point: IndexedPoint = {
        coordinates: coords,
        properties: feature.properties,
      };

      const key = this.cellKey(coords.latitude, coords.longitude);
      const cell = this.grid.get(key);
      if (cell) {
        cell.push(point);
      } else {
        this.grid.set(key, [point]);
      }
      this.pointCount++;
    }
  }

  /** Query points within radius of a center coordinate, sorted by distance */
  queryRadius(center: Coordinates, radiusKm: number, limit: number): FeatureWithDistance[] {
    const bbox = this.boundingBox(center, radiusKm);
    const results: FeatureWithDistance[] = [];

    const minRow = Math.floor(bbox.minLat / SPATIAL.GRID_SIZE_DEG);
    const maxRow = Math.floor(bbox.maxLat / SPATIAL.GRID_SIZE_DEG);
    const minCol = Math.floor(bbox.minLng / SPATIAL.GRID_SIZE_DEG);
    const maxCol = Math.floor(bbox.maxLng / SPATIAL.GRID_SIZE_DEG);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const key = `${row}:${col}`;
        const cell = this.grid.get(key);
        if (!cell) continue;

        for (const point of cell) {
          const dist = haversineDistance(center, point.coordinates);
          if (dist <= radiusKm) {
            results.push({
              properties: point.properties,
              coordinates: point.coordinates,
              distanceKm: dist,
            });
          }
        }
      }
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm);
    return results.slice(0, limit);
  }

  /** Total number of indexed points */
  get size(): number {
    return this.pointCount;
  }

  private extractCoordinates(feature: GeoJSONFeature): Coordinates | null {
    const geom = feature.geometry;
    if (!geom || !geom.coordinates) return null;

    if (geom.type === 'Point') {
      // GeoJSON: [longitude, latitude]
      const [lng, lat] = geom.coordinates;
      if (typeof lat === 'number' && typeof lng === 'number') {
        return { latitude: lat, longitude: lng };
      }
    }

    return null;
  }

  private cellKey(lat: number, lng: number): string {
    const row = Math.floor(lat / SPATIAL.GRID_SIZE_DEG);
    const col = Math.floor(lng / SPATIAL.GRID_SIZE_DEG);
    return `${row}:${col}`;
  }

  /** Calculate bounding box for a circle */
  private boundingBox(center: Coordinates, radiusKm: number): BoundingBox {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180));

    return {
      minLat: center.latitude - latDelta,
      maxLat: center.latitude + latDelta,
      minLng: center.longitude - lngDelta,
      maxLng: center.longitude + lngDelta,
    };
  }
}
