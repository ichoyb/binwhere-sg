import {
  API_V2_PATHS,
  ApiV2ErrorResponseSchema,
  PointsResponseSchema,
  RouteRequestSchema,
  RouteResponseSchema,
} from '../src';
import { runContract } from './api-contract';

process.exit(runContract({
  version: 'v2',
  paths: API_V2_PATHS,
  schemas: {
    'points.response': PointsResponseSchema,
    'route.request': RouteRequestSchema,
    'route.response': RouteResponseSchema,
    'error': ApiV2ErrorResponseSchema,
  },
}, process.argv.slice(2)));
