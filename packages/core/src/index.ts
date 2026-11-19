// Types
export type {
  ChannelType,
  ClassifyStatus,
  EwasteCategory,
  RecyclingPoint,
} from './types/recycling';
export {
  ChannelTypeSchema,
  ClassifyStatusSchema,
  CHANNEL_LABELS,
} from './types/recycling';

export type {
  AppView,
  ScanHistoryItem,
  NearbyChannel,
  NearbyQuery,
  NearbyQueryInput,
  NearbyPoint,
  NearbyResponse,
} from './types/app';
export {
  SINGAPORE_BOUNDS,
  isSingaporeCoordinates,
  ScanHistoryItemSchema,
  ScanHistorySchema,
  NearbyChannelSchema,
  NearbyQuerySchema,
  NearbyPointSchema,
  NearbyResponseSchema,
} from './types/app';

export type {
  ClassifyResult,
  ClassifyRequest,
  NextAction,
} from './types/classify';
export {
  ClassifyResultSchema,
  NextActionSchema,
  ClassifyResultShapeSchema,
  CHANNEL_STATUS,
  ClassifyRequestSchema,
  MAX_CLASSIFY_IMAGE_BASE64_LENGTH,
  MAX_CLASSIFY_TEXT_LENGTH,
} from './types/classify';

export type { ApiErrorCode, ApiErrorResponse } from './types/api';
export {
  API_V1_PATHS,
  ApiErrorCodeSchema,
  ApiErrorResponseSchema,
} from './types/api';

export type {
  ApiV2ErrorCode,
  ApiV2ErrorResponse,
  PointsLayer,
  EwasteAccept,
  PointsResponse,
  RouteRequest,
  RouteResponse,
} from './types/api-v2';
export {
  API_V2_PATHS,
  ApiV2ErrorCodeSchema,
  ApiV2ErrorResponseSchema,
  PointsLayerSchema,
  EwasteAcceptSchema,
  PointsRowSchema,
  PointsResponseSchema,
  RouteRequestSchema,
  RouteResponseSchema,
} from './types/api-v2';

// i18n
export type { Locale, TranslationKey } from './i18n';
export {
  LocaleSchema,
  t,
  LOCALE_OPTIONS,
  VALID_LOCALES,
  normalizeLocale,
  LOCALE_LANGUAGE_NAME,
} from './i18n';

// Constants & display
export {
  STATUS_CONFIG,
  CHANNEL_TO_NEARBY,
  getFriendlyError,
  getFriendlyApiError,
  CHANNEL_DISPLAY_CONFIG,
  LOW_CONFIDENCE_THRESHOLD,
  MAX_HISTORY_ITEMS,
  IMAGE_MAX_SIZE,
  IMAGE_QUALITY,
  SITE_URL,
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
  DATA_LICENSE_URL,
  OPEN_DATA_LICENCE_URL,
  SUPPORT_EMAIL,
} from './constants';

// Utils
export { formatDistance, estimateWalkTime } from './format';
export {
  formatReturnPointOpeningHours,
  buildBcrsGuideResult,
} from './bcrs';
export type { ReturnPointOpeningHours } from './bcrs';
export { mapItemToAcceptedItem } from './donation-mapping';
export { ewasteAcceptTranslationKey } from './ewaste';
export {
  BeverageEvidenceSchema,
  BEVERAGE_EVIDENCE_JSON_SCHEMA,
  applyBeverageActionPolicy,
  buildNextAction,
  getDestinationChannel,
  getResultShareText,
  toUnconfirmed,
} from './next-action';
export type { BeverageEvidence, BeverageInputMode } from './next-action';

// Pre-classified categories
export type { CategoryItem, ItemCategory } from './data/item-categories';
export { ITEM_CATEGORIES } from './data/item-categories';
export { getItemCategories } from './data/item-categories-i18n';

export type { PlanningArea } from './data/planning-areas';
export { PLANNING_AREAS, getPlanningArea } from './data/planning-areas';
