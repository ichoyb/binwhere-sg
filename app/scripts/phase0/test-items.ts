/**
 * Phase 0 Test Set: 85 items for Singapore recycling classification.
 * Each item has expected channel and status for accuracy measurement.
 */

import type { ChannelType, ClassifyStatus } from '../../src/types/recycling';

export interface TestItem {
  /** Item description (text-only, no image for Phase 0) */
  text: string;
  /** Expected recycling channel */
  expectedChannel: ChannelType;
  /** Expected classification status */
  expectedStatus: ClassifyStatus;
  /** Test category for reporting */
  category: 'standard' | 'tricky' | 'adversarial';
}

export const TEST_ITEMS: TestItem[] = [
  // ── blue_bin (20 items) ─────────────────────────────────────
  { text: 'clean newspaper', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty PET water bottle', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'aluminum drink can', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty glass jar', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'cardboard box, flattened', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean milk carton (Tetra Pak)', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'office paper', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty shampoo bottle', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'tin food can, rinsed', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean plastic container', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'glass wine bottle, empty', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'magazine', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty detergent bottle', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean plastic bag', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'tricky' },
  { text: 'metal cookie tin', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty aerosol can (fully used)', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'tricky' },
  { text: 'clean yogurt cup', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'paper egg carton', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty glass sauce bottle', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean aluminum foil', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'tricky' },

  // ── ewaste (10 items) ──────────────────────────────────────
  { text: 'old laptop', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken smartphone', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'old CRT TV', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'desktop computer', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'old printer', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken tablet (iPad)', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'old monitor', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'old washing machine', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken refrigerator', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'old air conditioner unit', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },

  // ── ewaste_battery (5 items) ───────────────────────────────
  { text: 'used AA batteries', expectedChannel: 'ewaste_battery', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'old lithium-ion battery from laptop', expectedChannel: 'ewaste_battery', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'button cell battery', expectedChannel: 'ewaste_battery', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'car battery', expectedChannel: 'ewaste_battery', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'rechargeable AAA batteries', expectedChannel: 'ewaste_battery', expectedStatus: 'special_handling', category: 'standard' },

  // ── lighting (5 items) ─────────────────────────────────────
  { text: 'fluorescent tube', expectedChannel: 'lighting', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'CFL compact fluorescent light bulb', expectedChannel: 'lighting', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'LED light bulb', expectedChannel: 'lighting', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken fluorescent lamp', expectedChannel: 'lighting', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'energy-saving light bulb', expectedChannel: 'lighting', expectedStatus: 'special_handling', category: 'standard' },

  // ── textile (5 items) ──────────────────────────────────────
  { text: 'old t-shirts', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'worn out shoes', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'old curtains', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'torn bed sheets', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'old handbag', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },

  // ── hazardous (5 items) ────────────────────────────────────
  { text: 'leftover paint can', expectedChannel: 'hazardous', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'insect spray can (partially full)', expectedChannel: 'hazardous', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'expired medicine pills', expectedChannel: 'hazardous', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'used motor oil', expectedChannel: 'hazardous', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'cleaning chemical bottles (with residue)', expectedChannel: 'hazardous', expectedStatus: 'special_handling', category: 'standard' },

  // ── bulky_waste (5 items) ──────────────────────────────────
  { text: 'old sofa', expectedChannel: 'bulky_waste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken wooden table', expectedChannel: 'bulky_waste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'old mattress', expectedChannel: 'bulky_waste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken bookshelf', expectedChannel: 'bulky_waste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'old bicycle', expectedChannel: 'bulky_waste', expectedStatus: 'special_handling', category: 'standard' },

  // ── donation (5 items) ─────────────────────────────────────
  { text: 'good condition winter jacket', expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'standard' },
  { text: 'used books in good condition', expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'standard' },
  { text: 'working blender', expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'standard' },
  { text: "children's toys, still working", expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'standard' },
  { text: 'good condition backpack', expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'standard' },

  // ── general_waste (10 items) ───────────────────────────────
  { text: 'used tissue paper', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'food waste (leftover rice)', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'styrofoam food container', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'dirty plastic bag with food stains', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'broken ceramic mug', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'used paper towel', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'toilet paper roll (used)', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'tricky' },
  { text: 'broken mirror', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'tricky' },
  { text: 'disposable chopsticks (used)', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'cigarette butts', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },

  // ── adversarial / edge cases (15 items) ────────────────────
  { text: 'pizza box with grease stains', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'half-eaten takeaway container', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'toy with built-in battery', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'adversarial' },
  { text: 'pyrex glass baking dish', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'old working iPhone in good condition', expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'adversarial' },
  { text: 'plastic straw', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'empty peanut butter jar (not rinsed)', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'old clothes that are torn and stained', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'adversarial' },
  { text: 'bubble wrap', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'adversarial' },
  { text: 'incandescent light bulb', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'prescription glasses', expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'adversarial' },
  { text: 'empty paint can (completely dry)', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'adversarial' },
  { text: 'coffee capsule (Nespresso)', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'old power bank', expectedChannel: 'ewaste_battery', expectedStatus: 'special_handling', category: 'adversarial' },
  { text: 'wet cardboard', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
];

/** Get items grouped by channel for per-channel accuracy */
export function getItemsByChannel(): Map<string, TestItem[]> {
  const map = new Map<string, TestItem[]>();
  for (const item of TEST_ITEMS) {
    const list = map.get(item.expectedChannel) || [];
    list.push(item);
    map.set(item.expectedChannel, list);
  }
  return map;
}
