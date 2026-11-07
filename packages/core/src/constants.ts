import type { ClassifyStatus, ChannelType } from './types/recycling';
import type { NearbyChannel } from './types/app';

export const STATUS_CONFIG: Record<ClassifyStatus, {
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  recyclable: {
    color: '#00A651',
    textColor: '#065F46',
    bgColor: '#E8F8EF',
    borderColor: '#B8E6C8',
  },
  special_handling: {
    color: '#F59E0B',
    textColor: '#92400E',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  consider_donating: {
    color: '#8E24AA',
    textColor: '#4A148C',
    bgColor: '#F3E5F5',
    borderColor: '#CE93D8',
  },
  not_recyclable: {
    color: '#475569',
    textColor: '#1E293B',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  not_sure: {
    color: '#7C3AED',
    textColor: '#5B21B6',
    bgColor: '#F3EEFF',
    borderColor: '#D4BFFF',
  },
};

/** Map AI channel values to API-supported nearby channels */
export const CHANNEL_TO_NEARBY: Record<ChannelType, NearbyChannel | null> = {
  blue_bin: 'blue_bin',
  return_point: 'return_point',
  ewaste: 'ewaste',
  ewaste_battery: 'ewaste_battery',
  lighting: 'lighting',
  textile: 'textile',
  hazardous: null,
  bulky_waste: null,
  donation: 'donation',
  general_waste: null,
};

import type { Locale } from './i18n/types';
import type { TranslationKey } from './i18n';
import { t } from './i18n';
import type { ApiErrorCode } from './types/api';

/** Error pattern → translation key mapping (order matters — first match wins) */
const ERROR_KEY_MAP: { pattern: string; key: TranslationKey }[] = [
  { pattern: '(429)', key: 'error.tooMany' },
  { pattern: 'Invalid image', key: 'error.invalidImage' },
  { pattern: 'Image too large', key: 'error.imageTooLarge' },
  { pattern: 'Server busy', key: 'error.serverBusy' },
  { pattern: 'Failed to fetch', key: 'error.noInternet' },
  { pattern: 'Classification failed', key: 'error.classifyFailed' },
  { pattern: 'Network Error', key: 'error.networkError' },
];

/** Map technical error to user-friendly translated message */
export function getFriendlyError(error: string, locale: Locale = 'en'): string {
  for (const { pattern, key } of ERROR_KEY_MAP) {
    if (error.includes(pattern)) return t(locale, key);
  }
  return t(locale, 'error.generic');
}

const API_ERROR_KEY_MAP: Record<ApiErrorCode, TranslationKey> = {
  INVALID_INPUT: 'error.classifyFailed',
  INVALID_IMAGE: 'error.invalidImage',
  IMAGE_TOO_LARGE: 'error.imageTooLarge',
  SERVER_BUSY: 'error.serverBusy',
  RATE_LIMITED: 'error.tooMany',
  FORBIDDEN: 'error.generic',
  DATA_UNAVAILABLE: 'error.serverBusy',
  CLASSIFICATION_FAILED: 'error.classifyFailed',
  NEARBY_QUERY_FAILED: 'error.generic',
  INVALID_RESPONSE: 'error.generic',
  NETWORK_ERROR: 'error.networkError',
  UNKNOWN: 'error.generic',
};

/** Map stable v1 API error codes to translated user-facing copy. */
export function getFriendlyApiError(
  code: ApiErrorCode,
  locale: Locale = 'en',
): string {
  return t(locale, API_ERROR_KEY_MAP[code]);
}

/** Display config for each disposal channel — used by DisposalGuide */
export const CHANNEL_DISPLAY_CONFIG: Record<ChannelType, {
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  /** SVG path data (24x24 viewBox, stroke-based) */
  iconPath: string;
}> = {
  blue_bin: {
    color: '#0077B6',
    bgColor: '#E8F4FA',
    textColor: '#075985',
    borderColor: '#B3D9EE',
    iconPath: 'M12 2L8.5 8H4l4.5 6L4 20h7l1-2 1 2h7l-4.5-6L20 8h-4.5L12 2zm0 3.5L14 9h3l-3 4 3 4h-3l-2 3.5L10 17H7l3-4-3-4h3l2-3.5z',
  },
  return_point: {
    color: '#00A651',
    bgColor: '#E8F8EF',
    textColor: '#065F46',
    borderColor: '#B8E6C8',
    iconPath: 'M4 12a8 8 0 0113.86-5.66M20 12a8 8 0 01-13.86 5.66M17 3v4h-4M7 21v-4h4M12 8v8m-3-4h6',
  },
  ewaste: {
    color: '#00897B',
    bgColor: '#E0F2F1',
    textColor: '#004D40',
    borderColor: '#B2DFDB',
    iconPath: 'M4 5h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm4 14h8m-4-3v3',
  },
  ewaste_battery: {
    color: '#00897B',
    bgColor: '#E0F2F1',
    textColor: '#004D40',
    borderColor: '#B2DFDB',
    iconPath: 'M7 7h10a1 1 0 011 1v9a1 1 0 01-1 1H7a1 1 0 01-1-1V8a1 1 0 011-1zm3-2h4v2h-4V5zm-1 6h2v4H9v-4zm4 0h2v4h-2v-4z',
  },
  lighting: {
    color: '#00897B',
    bgColor: '#E0F2F1',
    textColor: '#004D40',
    borderColor: '#B2DFDB',
    iconPath: 'M12 2a7 7 0 00-4 12.7V17a1 1 0 001 1h6a1 1 0 001-1v-2.3A7 7 0 0012 2zm-2 17h4m-3 2h2',
  },
  textile: {
    color: '#D4A017',
    bgColor: '#FFF9E6',
    textColor: '#7A5D12',
    borderColor: '#F0D97A',
    iconPath: 'M8 2l-5 5 3 1 1 13h10l1-13 3-1-5-5c-1 1-2.5 2-4 2S9 3 8 2z',
  },
  hazardous: {
    color: '#DC2626',
    bgColor: '#FEF2F2',
    textColor: '#991B1B',
    borderColor: '#FECACA',
    iconPath: 'M12 3L2 21h20L12 3zm0 5v6m0 2v2',
  },
  bulky_waste: {
    color: '#475569',
    bgColor: '#F1F5F9',
    textColor: '#1E293B',
    borderColor: '#CBD5E1',
    iconPath: 'M3 7h10v9H3V7zm10 2h4l3 3v4h-3m-14 0h2m7 0h4M6 18a2 2 0 100-4 2 2 0 000 4zm12 0a2 2 0 100-4 2 2 0 000 4z',
  },
  donation: {
    color: '#8E24AA',
    bgColor: '#F3E5F5',
    textColor: '#4A148C',
    borderColor: '#CE93D8',
    iconPath: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  },
  general_waste: {
    color: '#475569',
    bgColor: '#F1F5F9',
    textColor: '#1E293B',
    borderColor: '#CBD5E1',
    iconPath: 'M4 6h16l-1.5 14H5.5L4 6zm4-3h8v3H8V3zm-3 3h14M10 10v8m4-8v8',
  },
};

export const LOW_CONFIDENCE_THRESHOLD = 0.6;
export const MAX_HISTORY_ITEMS = 10;
export const IMAGE_MAX_SIZE = 2048;
export const IMAGE_QUALITY = 0.7;

/**
 * Public web pages both clients link to.
 *
 * App Store guideline 5.1.1 requires a privacy policy link inside the app as
 * well as in App Store Connect, so these URLs are a cross-client contract,
 * not a web detail. The pages live in app/src/app/(site)/.
 */
export const SITE_URL = 'https://binwhere.sg';
export const PRIVACY_POLICY_URL = `${SITE_URL}/privacy`;
export const SUPPORT_URL = `${SITE_URL}/support`;
export const DATA_LICENSE_URL = `${SITE_URL}/data-license`;
/** Contact published on the site footer, the privacy policy and App Store Connect. */
export const SUPPORT_EMAIL = 'ichoyb@gmail.com';
