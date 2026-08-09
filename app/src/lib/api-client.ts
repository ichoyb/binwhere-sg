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
    response = await fetch(API_V1_PATHS.classify, {
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
  params: NearbyQueryInput,
): Promise<NearbyResponse> {
  const parsedQuery = NearbyQuerySchema.safeParse(params);
  if (!parsedQuery.success) {
    throw new ApiError(400, 'INVALID_INPUT', 'Invalid nearby query');
  }
  const input = parsedQuery.data;
  const query = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
    channel: input.channel,
    limit: String(input.limit),
    radius: String(input.radius),
  });
  if (input.acceptedItem) query.set('acceptedItem', input.acceptedItem);

  let response: Response;
  try {
    response = await fetch(`${API_V1_PATHS.nearby}?${query}`);
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
    && error.code !== 'INVALID_RESPONSE';
}
