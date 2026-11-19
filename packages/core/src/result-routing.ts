import type { ClassifyResult } from './types/classify';
import type { NearbyChannel } from './types/app';
import { t, type Locale, type TranslationKey } from './i18n';
import { isEwasteItemKind, type ItemKind } from './item-kind';
import { isDonationItemKind } from './donation-mapping';

export const ALBA_COLLECTION_URL = 'https://alba-ewaste.sg/doorstep-collection/';

export interface ResultDestinationQuery {
  channel: NearbyChannel;
  itemKind?: ItemKind;
}

export function requiresEwasteCollection(result: ClassifyResult): boolean {
  return result.channel === 'ewaste'
    && (result.item_kind === 'large_household_appliance' || result.item_kind === 'electric_mobility_device');
}

export function applyItemKindPolicy(result: ClassifyResult, kind: ItemKind, locale: Locale): ClassifyResult {
  const classification = { ...result };
  delete classification.item_kind;
  if ((result.channel === 'ewaste' && isEwasteItemKind(kind))
    || (result.channel === 'donation' && isDonationItemKind(kind))) {
    classification.item_kind = kind;
  }
  if (requiresEwasteCollection(classification)) {
    classification.reason = t(locale, 'ewaste.collection.reason');
    classification.preparation = [
      t(locale, 'ewaste.collection.step1'),
      t(locale, 'ewaste.collection.step2'),
      t(locale, 'ewaste.collection.step3'),
    ];
    delete classification.tip;
  }
  return classification;
}

export function getResultDestinationQuery(result: ClassifyResult): ResultDestinationQuery | null {
  const channel = result.next_action?.channel ?? result.channel;
  switch (channel) {
    case 'ewaste':
      if (requiresEwasteCollection(result)) return null;
      return { channel, ...(result.item_kind ? { itemKind: result.item_kind } : {}) };
    case 'donation':
      return { channel, ...(result.item_kind ? { itemKind: result.item_kind } : {}) };
    case 'bulky_waste':
      return { channel: 'donation', itemKind: 'furniture' };
    case 'blue_bin':
    case 'return_point':
    case 'ewaste_battery':
    case 'lighting':
    case 'textile':
      return { channel };
    default:
      return null;
  }
}

export function getResultTitleKey(result: ClassifyResult): TranslationKey | null {
  if (requiresEwasteCollection(result)) return 'ewaste.collection.title';
  return result.channel ? `instruction.${result.channel}` : null;
}
