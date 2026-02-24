import type { ClassifyStatus, ChannelType } from '@/types/recycling';

export const STATUS_CONFIG: Record<ClassifyStatus, {
  label: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  recyclable: {
    label: 'Recyclable',
    color: '#00A651',
    textColor: '#065F46',
    bgColor: '#E8F8EF',
    borderColor: '#B8E6C8',
  },
  special_handling: {
    label: 'Special Handling',
    color: '#EA580C',
    textColor: '#9A3412',
    bgColor: '#FFF3E8',
    borderColor: '#FDCFB0',
  },
  consider_donating: {
    label: 'Consider Donating',
    color: '#0077B6',
    textColor: '#075985',
    bgColor: '#E8F4FA',
    borderColor: '#B3D9EE',
  },
  not_recyclable: {
    label: 'Not Recyclable',
    color: '#475569',
    textColor: '#1E293B',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  not_sure: {
    label: 'Not Sure',
    color: '#7C3AED',
    textColor: '#5B21B6',
    bgColor: '#F3EEFF',
    borderColor: '#D4BFFF',
  },
};

/** Map AI channel values to API-supported nearby channels */
export const CHANNEL_TO_NEARBY: Record<ChannelType, 'blue_bin' | 'ewaste' | null> = {
  blue_bin: 'blue_bin',
  ewaste: 'ewaste',
  ewaste_battery: 'ewaste',
  lighting: 'ewaste',
  textile: null,
  hazardous: null,
  bulky_waste: null,
  donation: null,
  general_waste: null,
};

/** User-friendly error messages */
export const ERROR_MESSAGES: Record<string, string> = {
  'Failed to fetch': 'No internet connection. Please check your network.',
  'Classification failed': 'Could not identify the item. Please try again.',
  'Network Error': 'Connection problem. Please check your network.',
};

/** Map technical error to user-friendly message */
export function getFriendlyError(error: string): string {
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (error.includes(key)) return message;
  }
  // Strip status codes like "(500)" from messages
  return error.replace(/\s*\(\d{3}\)\s*$/, '') || 'Something went wrong. Please try again.';
}

export const LOW_CONFIDENCE_THRESHOLD = 0.6;
export const MAX_HISTORY_ITEMS = 10;
export const IMAGE_MAX_SIZE = 1024;
export const IMAGE_QUALITY = 0.7;
