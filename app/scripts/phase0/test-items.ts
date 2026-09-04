/**
 * Versioned, answerable text benchmark for Singapore recycling classification.
 *
 * Every description includes the fact that changes the destination (condition,
 * contamination, remaining contents, or BCRS mark). Deliberately ambiguous cases
 * belong in the exact BCRS safety suite, where not_sure is the expected answer;
 * silently guessing their missing facts would corrupt this benchmark's oracle.
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

export const TEXT_BASELINE = {
  id: 'sg-consumer-text-v4',
  reviewedAt: '2026-09-04',
  decisionPolicy: 'Route clean, reusable textiles to the material-specific textile network and mention direct donation as an alternative. A hazardous test must name the hazard; a generic container with residue is not an answerable oracle.',
  sources: [
    'https://www.nea.gov.sg/docs/default-source/our-services/waste-management/recycling-guide_v6.pdf',
    'https://www.nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/e-waste-management/extended-producer-responsibility-%28epr%29-system-for-e-waste-management-system',
    'https://www.nea.gov.sg/our-services/waste-management/donation-resale-and-repair-channels/',
    'https://www.nea.gov.sg/our-services/waste-management/beverage-container-return-scheme/for-consumers',
    'https://www.recycle.gov.sg/materials/textile',
    'https://www.nea.gov.sg/our-services/public-cleanliness/environmental-cleaning-guidelines/guidelines/general-guidelines-for-cleaning-and-disinfecting-residences',
    'https://www.nea.gov.sg/our-services/pollution-control/chemical-safety/hazardous-substances',
  ],
} as const;

export const TEST_ITEMS: TestItem[] = [
  // ── blue_bin (20 items) ─────────────────────────────────────
  { text: 'clean newspaper', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty PET water bottle with no Singapore BCRS Deposit Mark', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'aluminum drink can with no Singapore BCRS Deposit Mark', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty and rinsed glass jar', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean, dry cardboard box, flattened', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty, rinsed and flattened milk carton (Tetra Pak)', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'office paper', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty and rinsed shampoo bottle', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'tin food can, rinsed', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean plastic container', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'glass wine bottle, empty and rinsed', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'magazine', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty and rinsed detergent bottle', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean plastic bag', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'tricky' },
  { text: 'metal cookie tin', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty aerosol can; fully used and nothing comes out when sprayed', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'tricky' },
  { text: 'clean yogurt cup', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'paper egg carton', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'empty and rinsed glass sauce bottle', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean aluminum foil', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'tricky' },

  // ── ewaste (10 items) ──────────────────────────────────────
  { text: 'broken laptop that cannot be reused', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken smartphone', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken CRT TV that cannot be reused', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken desktop computer that cannot be reused', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken printer that cannot be reused', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken tablet (iPad)', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken desktop monitor that cannot be reused', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken washing machine that cannot be reused', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken refrigerator', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken air conditioner unit that cannot be reused', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'standard' },

  // ── ewaste_battery (5 items) ───────────────────────────────
  { text: 'used AA batteries', expectedChannel: 'ewaste_battery', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'old lithium-ion battery from laptop', expectedChannel: 'ewaste_battery', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'button cell battery', expectedChannel: 'ewaste_battery', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'used 9-volt household battery with terminals taped', expectedChannel: 'ewaste_battery', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'rechargeable AAA batteries', expectedChannel: 'ewaste_battery', expectedStatus: 'special_handling', category: 'standard' },

  // ── lighting (5 items) ─────────────────────────────────────
  { text: 'fluorescent tube', expectedChannel: 'lighting', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'CFL compact fluorescent light bulb', expectedChannel: 'lighting', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'LED light bulb', expectedChannel: 'lighting', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken fluorescent lamp', expectedChannel: 'lighting', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'energy-saving light bulb', expectedChannel: 'lighting', expectedStatus: 'special_handling', category: 'standard' },

  // ── textile (5 items) ──────────────────────────────────────
  { text: 'clean, dry old t-shirts with normal wear and no stains or tears', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean, dry used shoes with normal wear, still intact', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean, dry used curtains with no mould or stains', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean, dry used bed sheets without tears or stains', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'clean, dry used handbag with normal wear, still intact', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },

  // ── hazardous (5 items) ────────────────────────────────────
  { text: 'leftover paint can', expectedChannel: 'hazardous', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'insect spray can (partially full)', expectedChannel: 'hazardous', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'used lead-acid car battery', expectedChannel: 'hazardous', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'used motor oil', expectedChannel: 'hazardous', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'partly full bottle of corrosive drain cleaner in its original labelled container', expectedChannel: 'hazardous', expectedStatus: 'special_handling', category: 'standard' },

  // ── bulky_waste (5 items) ──────────────────────────────────
  { text: 'broken sofa that cannot be reused', expectedChannel: 'bulky_waste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken wooden table', expectedChannel: 'bulky_waste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'used mattress that cannot be reused', expectedChannel: 'bulky_waste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken bookshelf', expectedChannel: 'bulky_waste', expectedStatus: 'special_handling', category: 'standard' },
  { text: 'broken bicycle that cannot be reused and is too large for a waste bin', expectedChannel: 'bulky_waste', expectedStatus: 'special_handling', category: 'standard' },

  // ── donation (5 items) ─────────────────────────────────────
  { text: 'clean, dry winter jacket in good condition', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },
  { text: 'used books in good condition', expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'standard' },
  { text: 'working blender', expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'standard' },
  { text: "children's toys, still working", expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'standard' },
  { text: 'clean, dry backpack in good condition', expectedChannel: 'textile', expectedStatus: 'recyclable', category: 'standard' },

  // ── general_waste (10 items) ───────────────────────────────
  { text: 'used tissue paper', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'food waste (leftover rice)', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'styrofoam food container', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'dirty plastic bag with food stains', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'broken ceramic mug', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'used paper towel', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'used and soiled toilet paper, not the clean cardboard tube', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'tricky' },
  { text: 'broken mirror', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'tricky' },
  { text: 'disposable chopsticks (used)', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },
  { text: 'cigarette butts', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'standard' },

  // ── adversarial / edge cases (15 items) ────────────────────
  { text: 'pizza box with grease stains', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'half-eaten takeaway container', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'broken electronic toy with a built-in battery that cannot be removed', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'adversarial' },
  { text: 'pyrex glass baking dish', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'old working iPhone in good condition', expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'adversarial' },
  { text: 'plastic straw', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'empty peanut butter jar (not rinsed)', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'old clothes that are torn and heavily stained', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'clean and dry bubble wrap', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'adversarial' },
  { text: 'used incandescent light bulb', expectedChannel: 'lighting', expectedStatus: 'special_handling', category: 'adversarial' },
  { text: 'prescription glasses in good reusable condition', expectedChannel: 'donation', expectedStatus: 'consider_donating', category: 'adversarial' },
  { text: 'completely empty, dry, all-metal paint can with no liquid paint', expectedChannel: 'blue_bin', expectedStatus: 'recyclable', category: 'adversarial' },
  { text: 'coffee capsule (Nespresso)', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
  { text: 'broken power bank that cannot be reused', expectedChannel: 'ewaste', expectedStatus: 'special_handling', category: 'adversarial' },
  { text: 'expired household medicine pills', expectedChannel: 'general_waste', expectedStatus: 'not_recyclable', category: 'adversarial' },
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
