import { z } from 'zod';

export const ItemKindSchema = z.enum([
  'ict_equipment',
  'large_household_appliance',
  'electric_mobility_device',
  'other_electrical',
  'books',
  'stationery',
  'toys',
  'baby_and_children_items',
  'household_goods',
  'furniture',
  'clothing',
  'shoes',
  'bags_and_accessories',
  'food',
  'other',
]);

export type ItemKind = z.infer<typeof ItemKindSchema>;

export const EWASTE_ITEM_KINDS = {
  ict_equipment: 'ict',
  large_household_appliance: 'large_appliance',
  electric_mobility_device: 'electric_mobility',
  other_electrical: 'non_regulated',
} as const;

export type EwasteItemKind = keyof typeof EWASTE_ITEM_KINDS;

export function isEwasteItemKind(kind: ItemKind): kind is EwasteItemKind {
  return Object.prototype.hasOwnProperty.call(EWASTE_ITEM_KINDS, kind);
}
