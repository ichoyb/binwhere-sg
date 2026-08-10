import {
  API_V1_PATHS,
  ApiErrorResponseSchema,
  ClassifyRequestSchema,
  ClassifyResultSchema,
  NearbyQuerySchema,
  NearbyResponseSchema,
  type ApiErrorCode,
  type ClassifyRequest,
  type ClassifyResult,
  type NearbyQueryInput,
  type NearbyResponse,
} from '@binwhere/core';

export const DEFAULT_API_BASE = 'https://binwhere.sg';

/** Resolve the API origin at bundle time and normalize a trailing slash. */
export function getApiBaseUrl(
  env: { EXPO_PUBLIC_API_BASE_URL?: string } = process.env as {
    EXPO_PUBLIC_API_BASE_URL?: string;
  },
): string {
  const raw = env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE;
  return raw.replace(/\/+$/, '');
}

export function buildClassifyUrl(baseUrl: string = getApiBaseUrl()): string {
  return `${baseUrl.replace(/\/+$/, '')}${API_V1_PATHS.classify}`;
}

export function buildClassifyBody(params: ClassifyRequest) {
  return ClassifyRequestSchema.parse(params);
}

export type NearbyQueryParams = NearbyQueryInput;

export function buildNearbyQueryString(params: NearbyQueryParams): string {
  const input = NearbyQuerySchema.parse(params);
  const query = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
    channel: input.channel,
    limit: String(input.limit),
    radius: String(input.radius),
  });
  if (input.acceptedItem) query.set('acceptedItem', input.acceptedItem);
  return query.toString();
}

export function buildNearbyUrl(
  params: NearbyQueryParams,
  baseUrl: string = getApiBaseUrl(),
): string {
  return `${baseUrl.replace(/\/+$/, '')}${API_V1_PATHS.nearby}?${buildNearbyQueryString(params)}`;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function toApiError(
  response: Response,
): Promise<ApiError> {
  try {
    const parsed = ApiErrorResponseSchema.safeParse(await response.json());
    if (parsed.success) {
      return new ApiError(response.status, parsed.data.code, parsed.data.error);
    }
  } catch {
    // Handled below as a v1 contract violation.
  }
  return new ApiError(
    response.status,
    'INVALID_RESPONSE',
    'Invalid API error response',
  );
}

export async function classifyItem(
  params: ClassifyRequest,
): Promise<ClassifyResult> {
  const parsedRequest = ClassifyRequestSchema.safeParse(params);
  if (!parsedRequest.success) {
    throw new ApiError(400, 'INVALID_INPUT', 'Invalid classification request');
  }

  let response: Response;
  try {
    response = await fetch(buildClassifyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsedRequest.data),
    });
  } catch (error) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed',
    );
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  try {
    return ClassifyResultSchema.parse(await response.json());
  } catch {
    throw new ApiError(502, 'INVALID_RESPONSE', 'Invalid classification response');
  }
}

export async function fetchNearby(
  params: NearbyQueryParams,
): Promise<NearbyResponse> {
  const parsedQuery = NearbyQuerySchema.safeParse(params);
  if (!parsedQuery.success) {
    throw new ApiError(400, 'INVALID_INPUT', 'Invalid nearby query');
  }

  let response: Response;
  try {
    response = await fetch(buildNearbyUrl(parsedQuery.data));
  } catch (error) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed',
    );
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  try {
    return NearbyResponseSchema.parse(await response.json());
  } catch {
    throw new ApiError(502, 'INVALID_RESPONSE', 'Invalid nearby response');
  }
}

export function isRetryable(error: unknown): boolean {
  return error instanceof ApiError
    && (error.status === 0 || error.status >= 500)
    && error.code !== 'INVALID_RESPONSE'
    // The classify provider has already exhausted its own bounded retries. Running
    // the whole request again here doubles both upstream attempts and user latency.
    && error.code !== 'CLASSIFICATION_FAILED';
}
