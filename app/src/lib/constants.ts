import type { ClassifyStatus, ChannelType } from '@/types/recycling';

export const STATUS_CONFIG: Record<ClassifyStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  recyclable: {
    label: 'Recyclable',
    color: '#00A651',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  special_handling: {
    label: 'Special Handling',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  consider_donating: {
    label: 'Consider Donating',
    color: '#0077B6',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  not_recyclable: {
    label: 'Not Recyclable',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  not_sure: {
    label: 'Not Sure',
    color: '#9CA3AF',
    bgColor: '#F9FAFB',
    borderColor: '#E5E7EB',
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

export const LOW_CONFIDENCE_THRESHOLD = 0.6;
export const MAX_HISTORY_ITEMS = 10;
export const IMAGE_MAX_SIZE = 1024;
export const IMAGE_QUALITY = 0.7;
