import { SpatialIndex } from './geo/spatial-index';
import { DatasetCache } from './cache/dataset-cache';
import { DATASET_IDS } from './shared/constants';
import type { GeoJSONFeatureCollection } from './shared/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Module-level singletons for Vercel serverless.
 * Warm instances reuse these across requests.
 * Data is loaded from build-time generated files (not API).
 */

let datasetCache: DatasetCache | null = null;
let loaded = false;

function getCache(): DatasetCache {
  if (!datasetCache) {
    datasetCache = new DatasetCache();
  }
  return datasetCache;
}

/**
 * Load build-time generated data and build spatial indexes.
 * Called lazily on first request. ~50ms from filesystem.
 */
function ensureLoaded(): void {
  if (loaded) return;

  const cache = getCache();
  const generatedDir = path.join(process.cwd(), 'src', 'data', 'generated');

  for (const [key, datasetId] of Object.entries(DATASET_IDS)) {
    const fileName = key.toLowerCase().replace(/_/g, '-') + '.json';
    const filePath = path.join(generatedDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`[data-gov] Generated file not found: ${filePath}. Run "npm run prebuild" first.`);
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const geojson = JSON.parse(raw) as GeoJSONFeatureCollection;

    const spatialIndex = new SpatialIndex();
    spatialIndex.buildFromFeatures(geojson.features);

    cache.setGeoJSON(datasetId, geojson, spatialIndex);
    console.log(`[data-gov] Loaded ${key}: ${geojson.features.length} features, spatial index built`);
  }

  loaded = true;
}

/** Get spatial index for a dataset, loading from generated files if needed */
export function getSpatialIndex(datasetId: string): SpatialIndex | undefined {
  ensureLoaded();
  return getCache().getSpatialIndex(datasetId);
}

/** Get spatial index for recycling bins */
export function getBlueBinIndex(): SpatialIndex | undefined {
  return getSpatialIndex(DATASET_IDS.RECYCLING_BINS);
}

/** Get spatial index for e-waste points */
export function getEwasteIndex(): SpatialIndex | undefined {
  return getSpatialIndex(DATASET_IDS.EWASTE_RECYCLING_POINTS);
}

/** Get spatial index for textile bins */
export function getTextileIndex(): SpatialIndex | undefined {
  return getSpatialIndex(DATASET_IDS.TEXTILE_BINS);
}
