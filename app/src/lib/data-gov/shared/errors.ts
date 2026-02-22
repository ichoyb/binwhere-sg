/** Base error for all data.gov.sg errors */
export class DataGovError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DataGovError';
  }
}

/** Rate limit exceeded */
export class RateLimitError extends DataGovError {
  constructor(
    public readonly endpoint: string,
    public readonly retryAfterMs: number,
  ) {
    super(`Rate limit exceeded for ${endpoint}. Retry after ${retryAfterMs}ms`, 'RATE_LIMITED');
    this.name = 'RateLimitError';
  }
}

/** HTTP request failure */
export class HttpError extends DataGovError {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly url: string,
  ) {
    super(`HTTP ${statusCode}: ${message} (${url})`, 'HTTP_ERROR');
    this.name = 'HttpError';
  }
}

/** Dataset download or parsing failure */
export class DatasetError extends DataGovError {
  constructor(
    message: string,
    public readonly datasetId: string,
  ) {
    super(`Dataset ${datasetId}: ${message}`, 'DATASET_ERROR');
    this.name = 'DatasetError';
  }
}

/** Invalid input parameters */
export class ValidationError extends DataGovError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/** Coordinate out of Singapore bounds */
export class CoordinateError extends ValidationError {
  constructor(lat: number, lng: number) {
    super(
      `Coordinates (${lat}, ${lng}) are outside Singapore bounds. ` +
        `Expected lat: 1.15~1.47, lng: 103.6~104.05`,
    );
    this.name = 'CoordinateError';
  }
}

/** Radius exceeds maximum */
export class RadiusError extends ValidationError {
  constructor(radius: number, maxRadius: number) {
    super(`Radius ${radius}km exceeds maximum of ${maxRadius}km`);
    this.name = 'RadiusError';
  }
}
