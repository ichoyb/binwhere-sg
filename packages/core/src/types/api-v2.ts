import { z } from 'zod';
import { SINGAPORE_BOUNDS } from './app';

export const API_V2_PATHS = {
  points: '/api/v2/points',
  route: '/api/v2/route',
} as const;

export const ApiV2ErrorCodeSchema = z.enum([
  'FORBIDDEN',
  'RATE_LIMITED',
  'POINTS_DATA_UNAVAILABLE',
  'INVALID_RESPONSE',
  'INVALID_INPUT',
  'ROUTE_NOT_ON_NETWORK',
  'ROUTE_NOT_FOUND',
  'SERVER_BUSY',
  'ROUTING_UNAVAILABLE',
  'ROUTING_TIMEOUT',
]);

export const ApiV2ErrorResponseSchema = z.object({
  code: ApiV2ErrorCodeSchema,
  error: z.string(),
});

export type ApiV2ErrorCode = z.infer<typeof ApiV2ErrorCodeSchema>;
export type ApiV2ErrorResponse = z.infer<typeof ApiV2ErrorResponseSchema>;

export const PointsLayerSchema = z.enum([
  'blue_bin',
  'return_point',
  'ewaste',
  'textile',
  'donation',
]);

export type PointsLayer = z.infer<typeof PointsLayerSchema>;

export const PointsRowSchema = z.tuple([
  z.number().min(SINGAPORE_BOUNDS.minLat).max(SINGAPORE_BOUNDS.maxLat),
  z.number().min(SINGAPORE_BOUNDS.minLng).max(SINGAPORE_BOUNDS.maxLng),
  z.string(),
  z.string(),
]).describe('[latitude, longitude, name, address]');

export const PointsResponseSchema = z.object({
  dataVersion: z.string().regex(/^[a-f0-9]{64}$/),
  layers: z.object({
    blue_bin: z.array(PointsRowSchema),
    return_point: z.array(PointsRowSchema),
    ewaste: z.array(PointsRowSchema),
    textile: z.array(PointsRowSchema),
    donation: z.array(PointsRowSchema),
  }).describe(
    'Each row has the implicit id "<layer>:<zero-based row index>". '
    + 'Ids are unique only within dataVersion and repeat for the same snapshot. '
    + 'Clients must not persist or compare ids across versions. Duplicate source records remain separate rows.',
  ),
});

export type PointsResponse = z.infer<typeof PointsResponseSchema>;

const RouteEndpointSchema = z.object({
  lat: z.number().min(SINGAPORE_BOUNDS.minLat).max(SINGAPORE_BOUNDS.maxLat),
  lng: z.number().min(SINGAPORE_BOUNDS.minLng).max(SINGAPORE_BOUNDS.maxLng),
});

export const RouteRequestSchema = z.object({
  origin: RouteEndpointSchema,
  destination: RouteEndpointSchema,
});

const SnappedEndpointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  offsetM: z.number().nonnegative(),
});

export const RouteResponseSchema = z.object({
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ])).min(2).describe('GeoJSON positions in [longitude, latitude] order.'),
  }),
  distanceM: z.number().nonnegative(),
  durationS: z.number().nonnegative(),
  snappedOrigin: SnappedEndpointSchema,
  snappedDestination: SnappedEndpointSchema,
  roadNetworkVersion: z.string().regex(/^[a-f0-9]{64}$/),
  osmDataTimestamp: z.iso.datetime({ precision: 0 }),
});

export type RouteRequest = z.infer<typeof RouteRequestSchema>;
export type RouteResponse = z.infer<typeof RouteResponseSchema>;
