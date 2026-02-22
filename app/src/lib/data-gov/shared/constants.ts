/** data.gov.sg API base URLs */
export const API_URLS = {
  /** Dataset metadata API (v2) */
  DATASET_METADATA: 'https://api-production.data.gov.sg/v2/public/api',
  /** Dataset download API (v1) */
  DATASET_DOWNLOAD: 'https://api-open.data.gov.sg/v1/public/api',
} as const;

/** Environment variable name for optional API key */
export const API_KEY_ENV = 'DATA_GOV_API_KEY';

/** Rate limit configurations per endpoint type (per 10-second sliding window) */
export const RATE_LIMITS = {
  datastore: { windowMs: 10_000, maxRequests: 4 },
  download: { windowMs: 10_000, maxRequests: 2 },
} as const;

/** Rate limits when API key is configured */
export const RATE_LIMITS_WITH_KEY = {
  datastore: { windowMs: 10_000, maxRequests: 20 },
  download: { windowMs: 10_000, maxRequests: 10 },
} as const;

export type EndpointType = keyof typeof RATE_LIMITS;

/** Dataset IDs for recycling & waste */
export const DATASET_IDS = {
  RECYCLING_BINS: 'd_4dde14826642f49eefff48b7832b90db',
  EWASTE_RECYCLING_POINTS: 'd_db40d004afeb5a7f0f555fdcc34934cc',
} as const;

/** Cache TTL defaults */
export const CACHE_TTL = {
  /** GeoJSON datasets: 24 hours */
  GEOJSON_MS: 24 * 60 * 60 * 1000,
} as const;

/** Singapore bounding box for coordinate validation */
export const SG_BOUNDS = {
  LAT_MIN: 1.15,
  LAT_MAX: 1.47,
  LNG_MIN: 103.6,
  LNG_MAX: 104.05,
} as const;

/** Spatial index configuration */
export const SPATIAL = {
  /** Grid cell size in degrees (~1.1km) */
  GRID_SIZE_DEG: 0.01,
  /** Maximum search radius in km */
  MAX_RADIUS_KM: 5,
} as const;

/** HTTP client defaults */
export const HTTP = {
  /** Request timeout in ms */
  TIMEOUT_MS: 30_000,
  /** Maximum retry attempts */
  MAX_RETRIES: 3,
  /** Base delay between retries in ms */
  RETRY_BASE_DELAY_MS: 1_000,
  /** Poll interval for download status in ms */
  POLL_INTERVAL_MS: 2_000,
  /** Maximum poll attempts for download */
  MAX_POLL_ATTEMPTS: 30,
} as const;
