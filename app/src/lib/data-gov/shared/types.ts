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

/** Dataset metadata returned by the data.gov.sg v2 API. */
export interface DatasetMetadata {
  datasetId: string;
  name: string;
  format: string;
  lastUpdatedAt: string;
  managedBy: string;
  coverageStart?: string;
  description?: string;
}

/** data.gov.sg metadata response envelope. */
export interface DatasetMetadataResponse {
  code: number;
  data?: DatasetMetadata;
  errMsg?: string | null;
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

/** Build-generated point counts passed from the server entrypoint to the UI. */
export interface GeoDataCounts {
  recyclingBins: number;
  ewaste: number;
  textile: number;
  reuseChannels: number;
  returnPoints: number;
}

/** CSV parsed row */
export type CSVRow = Record<string, string>;
