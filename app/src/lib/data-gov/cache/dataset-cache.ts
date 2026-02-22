import { CACHE_TTL } from '../shared/constants';
import type { GeoJSONFeatureCollection } from '../shared/types';
import { MemoryCache } from './memory-cache';
import { SpatialIndex } from '../geo/spatial-index';

interface GeoJSONCacheEntry {
  data: GeoJSONFeatureCollection;
  spatialIndex: SpatialIndex;
}

/**
 * Dataset cache for GeoJSON data with pre-built spatial indexes.
 * At runtime, data is loaded from build-time generated files (not API).
 * This cache keeps data in memory for warm Vercel instances.
 */
export class DatasetCache {
  private geojsonCache: MemoryCache<GeoJSONCacheEntry>;

  constructor() {
    this.geojsonCache = new MemoryCache<GeoJSONCacheEntry>({
      ttlMs: CACHE_TTL.GEOJSON_MS,
      staleWhileRevalidateMs: CACHE_TTL.GEOJSON_MS * 0.5,
    });
  }

  /** Get cached spatial index for a dataset */
  getSpatialIndex(datasetId: string): SpatialIndex | undefined {
    const entry = this.geojsonCache.get(datasetId);
    return entry?.value.spatialIndex;
  }

  /** Store a GeoJSON dataset with its pre-built spatial index */
  setGeoJSON(datasetId: string, data: GeoJSONFeatureCollection, spatialIndex: SpatialIndex): void {
    this.geojsonCache.set(datasetId, { data, spatialIndex });
  }

  /** Clear all caches */
  clear(): void {
    this.geojsonCache.clear();
  }
}
