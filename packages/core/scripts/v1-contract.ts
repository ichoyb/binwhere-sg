import {
  API_V1_PATHS,
  ApiErrorResponseSchema,
  ClassifyRequestSchema,
  ClassifyResultSchema,
  NearbyQuerySchema,
  NearbyResponseSchema,
} from '../src';
import { runContract } from './api-contract';

process.exit(runContract({
  version: 'v1',
  paths: API_V1_PATHS,
  schemas: {
    'classify.request': ClassifyRequestSchema,
    'classify.response': ClassifyResultSchema,
    'nearby.query': NearbyQuerySchema,
    'nearby.response': NearbyResponseSchema,
    'error': ApiErrorResponseSchema,
  },
}, process.argv.slice(2)));
