/**
 * Build-time script: Download GeoJSON from data.gov.sg and save to src/data/generated/.
 * Run during `next build` via "prebuild" script (no Vercel timeout constraints).
 *
 * Usage: npx tsx scripts/build-geo-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { HttpClient } from '../src/lib/data-gov/api/http-client';
import { DatasetClient } from '../src/lib/data-gov/api/dataset-client';
import { DATASET_IDS } from '../src/lib/data-gov/shared/constants';

const GENERATED_DIR = path.join(__dirname, '..', 'src', 'data', 'generated');

interface DatasetConfig {
  id: string;
  outputFile: string;
  label: string;
}

const DATASETS: DatasetConfig[] = [
  {
    id: DATASET_IDS.RECYCLING_BINS,
    outputFile: 'recycling-bins.json',
    label: 'Recycling Bins (Blue Bins)',
  },
  {
    id: DATASET_IDS.EWASTE_RECYCLING_POINTS,
    outputFile: 'ewaste-recycling-points.json',
    label: 'E-Waste Recycling Points',
  },
];

async function main() {
  console.log('[build-geo-data] Starting data download...\n');

  // Ensure output directory exists
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  const http = new HttpClient({ timeoutMs: 60_000, maxRetries: 3 });
  const client = new DatasetClient(http);

  for (const dataset of DATASETS) {
    console.log(`[build-geo-data] Downloading: ${dataset.label} (${dataset.id})`);
    const startTime = Date.now();

    try {
      const geojson = await client.getGeoJSON(dataset.id);
      const featureCount = geojson.features.length;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Write to file
      const outputPath = path.join(GENERATED_DIR, dataset.outputFile);
      fs.writeFileSync(outputPath, JSON.stringify(geojson));

      const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(0);
      console.log(`  -> ${featureCount} features, ${fileSizeKB} KB, ${elapsed}s\n`);
    } catch (error) {
      console.error(`  -> FAILED: ${(error as Error).message}\n`);
      process.exit(1);
    }
  }

  console.log('[build-geo-data] Done! Generated files:');
  const files = fs.readdirSync(GENERATED_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const size = (fs.statSync(path.join(GENERATED_DIR, file)).size / 1024).toFixed(0);
    console.log(`  ${file} (${size} KB)`);
  }
}

main().catch((err) => {
  console.error('[build-geo-data] Fatal error:', err);
  process.exit(1);
});
