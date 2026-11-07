import {
  API_V1_PATHS,
  API_V2_PATHS,
  ApiErrorResponseSchema,
  ApiV2ErrorResponseSchema,
  ClassifyRequestSchema,
  ClassifyResultSchema,
  NearbyQuerySchema,
  NearbyResponseSchema,
  PointsResponseSchema,
  type ApiV2ErrorCode,
  type PointsResponse,
  type ApiErrorCode,
  type ClassifyRequest,
  type ClassifyResult,
  type NearbyQueryInput,
  type NearbyResponse,
} from '@binwhere/core';

export const DEFAULT_API_BASE = 'https://binwhere.sg';

/**
 * Resolve the API origin and normalize a trailing slash.
 *
 * The override must be read as the literal `process.env.EXPO_PUBLIC_…` member
 * expression: Expo inlines those at bundle time and leaves any other access
 * pattern undefined on the device.
 */
export function getApiBaseUrl(
  override: string | undefined = process.env.EXPO_PUBLIC_API_BASE_URL,
): string {
  const raw = override || DEFAULT_API_BASE;
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

export type ApiEndpoint = 'classify' | 'nearby' | 'points';

/**
 * A server response this build could not parse against the v1 contract.
 *
 * An installed app cannot be redeployed, so this is the one failure the
 * server side must hear about from the client: it means a web deploy broke
 * a promise every installed version depends on.
 */
export interface ContractViolation {
  endpoint: ApiEndpoint;
  status: number;
  /** Human-readable `path: message` lines, capped so a report stays small. */
  issues: string[];
}

export type ContractViolationReporter = (violation: ContractViolation) => void;

let reportContractViolation: ContractViolationReporter = (violation) => {
  console.error('[api] contract violation', violation);
};

/** Route violations to crash reporting; the default only logs, so tests stay SDK-free. */
export function setContractViolationReporter(reporter: ContractViolationReporter): void {
  reportContractViolation = reporter;
}

const MAX_REPORTED_ISSUES = 10;

/** Structural view of a Zod error, so this module never imports zod directly. */
interface SchemaIssues {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}

function describeIssues(error: SchemaIssues): string[] {
  return error.issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => `${issue.path.map(String).join('.') || '<root>'}: ${issue.message}`);
}

/** Read the body as JSON, reporting a non-JSON body as a contract violation. */
async function readJson(response: Response, endpoint: ApiEndpoint, signal?: AbortSignal): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    reportContractViolation({
      endpoint,
      status: response.status,
      issues: ['<body>: not valid JSON'],
    });
    throw new ApiError(response.status, 'INVALID_RESPONSE', `Invalid ${endpoint} response`);
  }
}

/** Parse a body against a v1 schema, reporting any mismatch before failing. */
function parseContract<T>(
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: SchemaIssues } },
  body: unknown,
  response: Response,
  endpoint: ApiEndpoint,
): T {
  const parsed = schema.safeParse(body);
  if (parsed.success) return parsed.data;
  reportContractViolation({
    endpoint,
    status: response.status,
    issues: describeIssues(parsed.error),
  });
  throw new ApiError(502, 'INVALID_RESPONSE', `Invalid ${endpoint} response`);
}

async function toApiError(response: Response, endpoint: ApiEndpoint): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const parsed = ApiErrorResponseSchema.safeParse(body);
  if (parsed.success) {
    return new ApiError(response.status, parsed.data.code, parsed.data.error);
  }
  // Any non-2xx without the v1 error envelope: an edge error page, a crashed
  // origin, or a server that changed its error shape. Report it, keep the
  // real HTTP status so retry logic still sees a 5xx as retryable.
  reportContractViolation({
    endpoint,
    status: response.status,
    issues: body === undefined ? ['<body>: not valid JSON'] : describeIssues(parsed.error),
  });
  return new ApiError(response.status, 'INVALID_RESPONSE', 'Invalid API error response');
}

export async function classifyItem(
  params: ClassifyRequest,
  signal?: AbortSignal,
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
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed',
    );
  }

  if (!response.ok) {
    throw await toApiError(response, 'classify');
  }

  return parseContract(ClassifyResultSchema, await readJson(response, 'classify', signal), response, 'classify');
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
    throw await toApiError(response, 'nearby');
  }

  return parseContract(NearbyResponseSchema, await readJson(response, 'nearby'), response, 'nearby');
}

export function isRetryable(error: unknown): boolean {
  return error instanceof ApiError
    && (error.status === 0 || error.status >= 500)
    && error.code !== 'INVALID_RESPONSE'
    // The classify provider has already exhausted its own bounded retries. Running
    // the whole request again here doubles both upstream attempts and user latency.
    && error.code !== 'CLASSIFICATION_FAILED';
}

export class ApiV2Error extends Error {
  constructor(public readonly status: number, public readonly code: ApiV2ErrorCode, message: string) {
    super(message);
    this.name = 'ApiV2Error';
  }
}

export function buildPointsUrl(baseUrl: string = getApiBaseUrl()): string {
  return `${baseUrl.replace(/\/+$/, '')}${API_V2_PATHS.points}`;
}

export type PointsUpdate = { status: 304 } | { status: 200; response: PointsResponse; etag: string | null };

export async function fetchPoints(url: string, etag: string | null): Promise<PointsUpdate> {
  const response = await fetch(url, {
    headers: etag === null ? {} : { 'If-None-Match': etag },
  });
  if (response.status === 304) return { status: 304 };
  const body = await readJson(response, 'points');
  if (!response.ok) {
    const error = parseContract(ApiV2ErrorResponseSchema, body, response, 'points');
    throw new ApiV2Error(response.status, error.code, error.error);
  }
  return {
    status: 200,
    response: parseContract(PointsResponseSchema, body, response, 'points'),
    etag: response.headers.get('ETag'),
  };
}
