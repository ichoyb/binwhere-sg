import {
  CHANNEL_TO_NEARBY,
  getDestinationChannel,
  mapItemToAcceptedItem,
  type ClassifyResult,
  type NearbyChannel,
} from '@binwhere/core';

export interface NearbyTarget {
  channel: NearbyChannel;
  acceptedItem?: string;
}

/** Resolve the nearby query represented by a classification result. */
export function getNearbyTarget(result: ClassifyResult): NearbyTarget | null {
  if (result.channel === 'bulky_waste') {
    return { channel: 'donation', acceptedItem: 'Furniture' };
  }

  const destination = getDestinationChannel(result);
  if (!destination) return null;
  const channel = CHANNEL_TO_NEARBY[destination];
  if (!channel) return null;

  const acceptedItem = channel === 'donation'
    ? mapItemToAcceptedItem(result.item)
    : undefined;
  return { channel, ...(acceptedItem ? { acceptedItem } : {}) };
}
