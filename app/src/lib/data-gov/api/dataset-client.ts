import Papa from 'papaparse';
import { API_URLS, HTTP } from '../shared/constants';
import { DatasetError } from '../shared/errors';
import type {
  PollDownloadResponse,
  GeoJSONFeatureCollection,
  CSVRow,
} from '../shared/types';
import type { HttpClient } from './http-client';

/**
 * Unified Dataset client: download -> parse for both GeoJSON and CSV.
 *
 * Download flow: poll-download -> S3 pre-signed URL -> raw content.
 * Used at build-time (scripts/build-geo-data.ts), NOT at runtime on Vercel.
 */
export class DatasetClient {
  constructor(private readonly http: HttpClient) {}

  /** Download and parse a GeoJSON dataset */
  async getGeoJSON(datasetId: string): Promise<GeoJSONFeatureCollection> {
    const raw = await this.downloadDataset(datasetId);
    try {
      const geojson = JSON.parse(raw) as GeoJSONFeatureCollection;
      if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
        throw new Error('Invalid GeoJSON structure');
      }
      return geojson;
    } catch (error) {
      throw new DatasetError(
        `Failed to parse GeoJSON: ${(error as Error).message}`,
        datasetId,
      );
    }
  }

  /** Download and parse a CSV dataset */
  async getCSV(datasetId: string): Promise<CSVRow[]> {
    const raw = await this.downloadDataset(datasetId);
    try {
      const result = Papa.parse<CSVRow>(raw, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });

      if (result.errors.length > 0) {
        const criticalErrors = result.errors.filter((e) => e.type !== 'FieldMismatch');
        if (criticalErrors.length > 0) {
          throw new Error(criticalErrors.map((e) => e.message).join('; '));
        }
      }

      return result.data;
    } catch (error) {
      if (error instanceof DatasetError) throw error;
      throw new DatasetError(`Failed to parse CSV: ${(error as Error).message}`, datasetId);
    }
  }

  /** Download a dataset, returning raw content */
  private async downloadDataset(datasetId: string): Promise<string> {
    const downloadUrl = await this.getDownloadUrl(datasetId);
    return this.http.downloadRaw(downloadUrl);
  }

  /**
   * Get the S3 pre-signed download URL via poll-download.
   */
  private async getDownloadUrl(datasetId: string): Promise<string> {
    const base = `${API_URLS.DATASET_DOWNLOAD}/datasets/${datasetId}`;
    const pollUrl = `${base}/poll-download`;

    for (let attempt = 0; attempt < HTTP.MAX_POLL_ATTEMPTS; attempt++) {
      const response = await this.http.get<PollDownloadResponse>(pollUrl);

      if (response.data?.url) {
        return response.data.url;
      }

      if (response.errMsg) {
        throw new DatasetError(`Poll-download error: ${response.errMsg}`, datasetId);
      }

      // Not ready yet, wait and retry
      await new Promise((resolve) => setTimeout(resolve, HTTP.POLL_INTERVAL_MS));
    }

    throw new DatasetError(
      `Download not ready after ${HTTP.MAX_POLL_ATTEMPTS} attempts`,
      datasetId,
    );
  }
}
