/**
 * Fetch NEA Reuse Channels API and convert to GeoJSON FeatureCollection.
 * Called by build-geo-data.ts during prebuild.
 *
 * NEA API: https://www.nea.gov.sg/api/OneMap/GetMapData/reusechannels
 * Returns ~75 donation/resale/repair points with ACCEPTEDITEMS field.
 *
 * Usage: npx tsx scripts/convert-reusechannels-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface NEAReusechannelPoint {
  NAME: string;
  DESCRIPTION: string;
  ADDRESSBUILDINGNAME: string;
  ADDRESSBLOCKHOUSENUMBER: string;
  ADDRESSPOSTALCODE: string;
  ADDRESSSTREETNAME: string;
  ACCEPTEDITEMS: string;
  REUSETYPE: string;
  FULLADDRESS: string;
  Type: string;
  LatLng: string;
  ICON_NAME: string;
}

interface NEAResponse {
  SrchResults: [{ FeatCount: number; Theme_Name: string }, ...NEAReusechannelPoint[]];
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, string>;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

const NEA_API_URL = 'https://www.nea.gov.sg/api/OneMap/GetMapData/reusechannels';
const GENERATED_DIR = path.join(__dirname, '..', 'src', 'data', 'generated');
const OUTPUT_PATH = path.join(GENERATED_DIR, 'reuse-channels.json');

export async function fetchAndConvertReusechannels(): Promise<{ featureCount: number; outputPath: string }> {
  const res = await fetch(NEA_API_URL, {
    headers: { 'User-Agent': 'BinWhere/1.0' },
  });

  if (!res.ok) {
    throw new Error(`NEA API responded ${res.status}: ${res.statusText}`);
  }

  let rawBody = await res.json();
  // NEA API sometimes returns JSON wrapped in a string — unwrap if needed
  if (typeof rawBody === 'string') {
    rawBody = JSON.parse(rawBody);
  }
  const data = rawBody as NEAResponse;
  const results = data.SrchResults;

  if (!results || results.length < 2) {
    throw new Error('NEA API returned empty or invalid data');
  }

  // First element is metadata, rest are points
  const points = results.slice(1) as unknown as NEAReusechannelPoint[];

  const features: GeoJSONFeature[] = [];
  for (const point of points) {
    if (!point.LatLng) continue;

    // Parse "1.2875206745,103.8390293717" → [lng, lat]
    const parts = point.LatLng.split(',');
    if (parts.length !== 2) continue;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) continue;

    // Validate Singapore bounds
    if (lat < 1.15 || lat > 1.47 || lng < 103.6 || lng > 104.05) continue;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat], // GeoJSON: [lng, lat]
      },
      properties: {
        NAME: point.NAME || '',
        DESCRIPTION: point.DESCRIPTION || '',
        ADDRESSBUILDINGNAME: point.ADDRESSBUILDINGNAME || '',
        ADDRESSBLOCKHOUSENUMBER: point.ADDRESSBLOCKHOUSENUMBER || '',
        ADDRESSPOSTALCODE: point.ADDRESSPOSTALCODE || '',
        ADDRESSSTREETNAME: point.ADDRESSSTREETNAME || '',
        ACCEPTEDITEMS: point.ACCEPTEDITEMS || '',
        REUSETYPE: point.REUSETYPE || '',
        FULLADDRESS: point.FULLADDRESS || '',
      },
    });
  }

  const geojson: GeoJSONFeatureCollection = {
    type: 'FeatureCollection',
    features,
  };

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson));

  return { featureCount: features.length, outputPath: OUTPUT_PATH };
}

// Allow direct execution
if (require.main === module) {
  fetchAndConvertReusechannels()
    .then(({ featureCount, outputPath }) => {
      const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(0);
      console.log(`[reusechannels] ${featureCount} features → ${outputPath} (${fileSizeKB} KB)`);
    })
    .catch((err) => {
      console.error('[reusechannels] Failed:', err);
      process.exit(1);
    });
}
