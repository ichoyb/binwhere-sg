// Recycling point types for BinWhere

export type ChannelType =
  | 'blue_bin'
  | 'ewaste'
  | 'ewaste_battery'
  | 'lighting'
  | 'textile'
  | 'hazardous'
  | 'bulky_waste'
  | 'donation'
  | 'general_waste';

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  blue_bin: 'Blue Recycling Bin',
  ewaste: 'E-Waste Recycling',
  ewaste_battery: 'Battery Recycling',
  lighting: 'Lighting Waste',
  textile: 'Textile Recycling',
  hazardous: 'Hazardous Waste',
  bulky_waste: 'Bulky Waste Disposal',
  donation: 'Donation',
  general_waste: 'General Waste',
};

export type ClassifyStatus =
  | 'recyclable'
  | 'special_handling'
  | 'consider_donating'
  | 'not_recyclable'
  | 'not_sure';

export type EwasteCategory = 'ICT' | 'batteries' | 'lamps' | 'non_regulated' | 'all';

export interface RecyclingPoint {
  id: string;
  channel: ChannelType;
  name: string;

  // Location
  lat: number;
  lng: number;

  // Address
  address: string;
  postalCode: string;
  blockNumber?: string;
  buildingName?: string;
  floorNumber?: string;
  unitNumber?: string;

  // Details
  description?: string;
  acceptedItems?: string[];
  accessRestriction: 'public' | 'private';
  hyperlink?: string;
  photoUrl?: string;

  // Data provenance
  source: 'data.gov.sg' | 'nea' | 'user';
  sourceId?: string;
  lastUpdated: string;
  dataAsOf: string;
}
