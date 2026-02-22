/** data.gov.sg Dataset API response types */

/** Poll-download response */
export interface PollDownloadResponse {
  code: number;
  data: {
    url?: string;
    readyToDownload?: boolean;
    message?: string;
  };
  errMsg?: string;
}

/** GeoJSON Feature */
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: Record<string, unknown>;
}

/** GeoJSON FeatureCollection */
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/** CSV parsed row */
export type CSVRow = Record<string, string>;
