import { z } from 'zod';

export const API_V1_PATHS = {
  classify: '/api/v1/classify',
  nearby: '/api/v1/nearby',
} as const;

export const ApiErrorCodeSchema = z.enum([
  'INVALID_INPUT',
  'INVALID_IMAGE',
  'IMAGE_TOO_LARGE',
  'SERVER_BUSY',
  'RATE_LIMITED',
  'FORBIDDEN',
  'DATA_UNAVAILABLE',
  'CLASSIFICATION_FAILED',
  'NEARBY_QUERY_FAILED',
  'INVALID_RESPONSE',
  'NETWORK_ERROR',
  'UNKNOWN',
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorResponseSchema = z.object({
  code: ApiErrorCodeSchema,
  error: z.string(),
  details: z.unknown().optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
