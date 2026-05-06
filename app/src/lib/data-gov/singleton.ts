import { SpatialIndex } from './geo/spatial-index';
import { DATASET_IDS } from './shared/constants';
import type { GeoJSONFeatureCollection } from './shared/types';
import * as fs from 'fs';
import * as path from 'path';

const indexes = new Map<string, SpatialIndex>();
let loaded = false;

function ensureLoaded(): void {
  if (loaded) return;

  const generatedDir = path.join(process.cwd(), 'src', 'data', 'generated');

  for (const [key, datasetId] of Object.entries(DATASET_IDS)) {
    const fileName = key.toLowerCase().replace(/_/g, '-') + '.json';
    const filePath = path.join(generatedDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`[data-gov] Generated file not found: ${filePath}. Run "npm run prebuild" first.`);
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const geojson = JSON.parse(raw) as GeoJSONFeatureCollection;

    const spatialIndex = new SpatialIndex();
    spatialIndex.buildFromFeatures(geojson.features);

    indexes.set(datasetId, spatialIndex);
    console.log(`[data-gov] Loaded ${key}: ${geojson.features.length} features, spatial index built`);
  }

  loaded = true;
}

export function getSpatialIndex(datasetId: string): SpatialIndex | undefined {
  ensureLoaded();
  return indexes.get(datasetId);
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

/** Get spatial index for reuse channels (donation/resale/repair) */
export function getReuseChannelsIndex(): SpatialIndex | undefined {
  return getSpatialIndex(DATASET_IDS.REUSE_CHANNELS);
}

/** Get spatial index for BCRS return points */
export function getReturnPointIndex(): SpatialIndex | undefined {
  return getSpatialIndex(DATASET_IDS.RETURN_POINTS);
}
