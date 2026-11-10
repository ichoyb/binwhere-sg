import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PointsLayer, PointsResponse } from '@binwhere/core';
import type { GeoJSONFeatureCollection } from './data-gov/shared/types';
import { getPointDetails } from './point-details';
import { getEwasteAccepts, parseEwasteDescription } from './ewaste';

const LAYER_FILES = {
  blue_bin: 'recycling-bins.json',
  return_point: 'return-points.json',
  ewaste: 'ewaste-recycling-points.json',
  textile: 'textile-bins.json',
  donation: 'reuse-channels.json',
} as const satisfies Record<PointsLayer, string>;

let cached: PointsResponse | undefined;

export function getPointsData(): PointsResponse {
  if (cached) return cached;

  const directory = join(process.cwd(), 'src', 'data', 'generated');
  const manifest = readFileSync(join(directory, 'data-manifest.json'));
  const layers: PointsResponse['layers'] = {
    blue_bin: [],
    return_point: [],
    ewaste: [],
    textile: [],
    donation: [],
  };
  const ewasteAccepts: NonNullable<PointsResponse['ewasteAccepts']> = [];

  for (const layer of Object.keys(LAYER_FILES) as PointsLayer[]) {
    const data = JSON.parse(readFileSync(join(directory, LAYER_FILES[layer]), 'utf8')) as GeoJSONFeatureCollection;
    layers[layer] = data.features.map((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const { name, address } = getPointDetails(feature.properties, layer);
      if (layer === 'ewaste') {
        ewasteAccepts.push(getEwasteAccepts(parseEwasteDescription(
          feature.properties.DESCRIPTION as string, feature.properties.OBJECTID,
        ).items));
      }
      return [lat, lng, name, address];
    });
  }

  cached = {
    dataVersion: createHash('sha256').update(manifest).digest('hex'),
    layers,
    ewasteAccepts,
  };
  return cached;
}
