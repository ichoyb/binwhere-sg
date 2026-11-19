import type { ItemKind } from './item-kind';

export const DONATION_CATEGORIES = {
  books: 'Books',
  stationery: 'Stationery',
  toys: 'Toys',
  baby_and_children_items: "Baby and children's Items",
  household_goods: 'Household goods',
  furniture: 'Furniture',
  clothing: 'Clothing',
  shoes: 'Shoes',
  bags_and_accessories: 'Bags and accessories',
  food: 'Food',
  ict_equipment: 'ICT equipment',
  large_household_appliance: 'Large home appliances',
  other_electrical: 'Other electrical appliances',
} as const;

export type DonationItemKind = keyof typeof DONATION_CATEGORIES;

export function isDonationItemKind(kind: ItemKind): kind is DonationItemKind {
  return Object.prototype.hasOwnProperty.call(DONATION_CATEGORIES, kind);
}
