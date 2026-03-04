import type { ClassifyStatus, ChannelType } from '@/types/recycling';
import type { NearbyChannel } from '@/types/app';

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
    color: '#F59E0B',
    textColor: '#92400E',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  consider_donating: {
    label: 'Consider Donating',
    color: '#8E24AA',
    textColor: '#4A148C',
    bgColor: '#F3E5F5',
    borderColor: '#CE93D8',
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
export const CHANNEL_TO_NEARBY: Record<ChannelType, NearbyChannel | null> = {
  blue_bin: 'blue_bin',
  ewaste: 'ewaste',
  ewaste_battery: 'ewaste_battery',
  lighting: 'lighting',
  textile: 'textile',
  hazardous: null,
  bulky_waste: null,
  donation: 'donation',
  general_waste: null,
};

/** User-friendly error messages (order matters — first match wins) */
export const ERROR_MESSAGES: Record<string, string> = {
  '(429)': 'Too many requests. Please wait a moment and try again.',
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

/** Display config for each disposal channel — used by DisposalGuide */
export const CHANNEL_DISPLAY_CONFIG: Record<ChannelType, {
  instruction: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  /** SVG path data (24x24 viewBox, stroke-based) */
  iconPath: string;
}> = {
  blue_bin: {
    instruction: 'Put in Blue Recycling Bin',
    color: '#0077B6',
    bgColor: '#E8F4FA',
    textColor: '#075985',
    borderColor: '#B3D9EE',
    // Recycle arrows icon
    iconPath: 'M12 2L8.5 8H4l4.5 6L4 20h7l1-2 1 2h7l-4.5-6L20 8h-4.5L12 2zm0 3.5L14 9h3l-3 4 3 4h-3l-2 3.5L10 17H7l3-4-3-4h3l2-3.5z',
  },
  ewaste: {
    instruction: 'Bring to E-Waste Collection Point',
    color: '#00897B',
    bgColor: '#E0F2F1',
    textColor: '#004D40',
    borderColor: '#B2DFDB',
    // Monitor/screen icon
    iconPath: 'M4 5h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm4 14h8m-4-3v3',
  },
  ewaste_battery: {
    instruction: 'Bring to Battery Collection Point',
    color: '#00897B',
    bgColor: '#E0F2F1',
    textColor: '#004D40',
    borderColor: '#B2DFDB',
    // Battery icon
    iconPath: 'M7 7h10a1 1 0 011 1v9a1 1 0 01-1 1H7a1 1 0 01-1-1V8a1 1 0 011-1zm3-2h4v2h-4V5zm-1 6h2v4H9v-4zm4 0h2v4h-2v-4z',
  },
  lighting: {
    instruction: 'Bring to Lighting Waste Collection',
    color: '#00897B',
    bgColor: '#E0F2F1',
    textColor: '#004D40',
    borderColor: '#B2DFDB',
    // Lightbulb icon
    iconPath: 'M12 2a7 7 0 00-4 12.7V17a1 1 0 001 1h6a1 1 0 001-1v-2.3A7 7 0 0012 2zm-2 17h4m-3 2h2',
  },
  textile: {
    instruction: 'Bring to Textile Collection Bin',
    color: '#D4A017',
    bgColor: '#FFF9E6',
    textColor: '#7A5D12',
    borderColor: '#F0D97A',
    // T-shirt/clothing icon
    iconPath: 'M8 2l-5 5 3 1 1 13h10l1-13 3-1-5-5c-1 1-2.5 2-4 2S9 3 8 2z',
  },
  hazardous: {
    instruction: 'Bring to Hazardous Waste Collection',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    textColor: '#991B1B',
    borderColor: '#FECACA',
    // Warning triangle icon
    iconPath: 'M12 3L2 21h20L12 3zm0 5v6m0 2v2',
  },
  bulky_waste: {
    instruction: 'Schedule Bulky Waste Pickup',
    color: '#475569',
    bgColor: '#F1F5F9',
    textColor: '#1E293B',
    borderColor: '#CBD5E1',
    // Truck icon
    iconPath: 'M3 7h10v9H3V7zm10 2h4l3 3v4h-3m-14 0h2m7 0h4M6 18a2 2 0 100-4 2 2 0 000 4zm12 0a2 2 0 100-4 2 2 0 000 4z',
  },
  donation: {
    instruction: 'Donate at Collection Point',
    color: '#8E24AA',
    bgColor: '#F3E5F5',
    textColor: '#4A148C',
    borderColor: '#CE93D8',
    // Heart icon
    iconPath: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  },
  general_waste: {
    instruction: 'Put in General Waste Bin',
    color: '#475569',
    bgColor: '#F1F5F9',
    textColor: '#1E293B',
    borderColor: '#CBD5E1',
    // Trash bin icon
    iconPath: 'M4 6h16l-1.5 14H5.5L4 6zm4-3h8v3H8V3zm-3 3h14M10 10v8m4-8v8',
  },
};

export const LOW_CONFIDENCE_THRESHOLD = 0.6;
export const MAX_HISTORY_ITEMS = 10;
export const IMAGE_MAX_SIZE = 1024;
export const IMAGE_QUALITY = 0.7;
