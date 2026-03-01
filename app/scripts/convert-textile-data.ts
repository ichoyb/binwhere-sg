/**
 * Convert textile-bins-raw.json → GeoJSON FeatureCollection.
 * Called by build-geo-data.ts during prebuild.
 *
 * Usage: npx tsx scripts/convert-textile-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface RawTextileBin {
  id: string;
  place: string;
  lat: number;
  lng: number;
  binType: string;
  remarks: string;
  imageUrl: string;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, string | number>;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

const RAW_PATH = path.join(__dirname, '..', 'src', 'data', 'textile-bins-raw.json');
const GENERATED_DIR = path.join(__dirname, '..', 'src', 'data', 'generated');
const OUTPUT_PATH = path.join(GENERATED_DIR, 'textile-bins.json');

export function convertTextileData(): { featureCount: number; outputPath: string } {
  const raw: RawTextileBin[] = JSON.parse(fs.readFileSync(RAW_PATH, 'utf-8'));

  const geojson: GeoJSONFeatureCollection = {
    type: 'FeatureCollection',
    features: raw.map((bin) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [bin.lng, bin.lat],
      },
      properties: {
        OBJECTID: bin.id,
        NAME: bin.place,
        DESCRIPTION: bin.remarks,
        ADDRESSPOSTALCODE: '',
        ACCESSRESTRICTION: 'Public',
      },
    })),
  };

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson));

  return { featureCount: geojson.features.length, outputPath: OUTPUT_PATH };
}

// Allow direct execution
if (require.main === module) {
  const { featureCount, outputPath } = convertTextileData();
  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(0);
  console.log(`[convert-textile] ${featureCount} features → ${outputPath} (${fileSizeKB} KB)`);
}
