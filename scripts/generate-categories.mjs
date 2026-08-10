#!/usr/bin/env node
/**
 * Pre-generate ClassifyResult for all dropdown category items.
 *
 * Usage:
 *   TOKENHUB_API_KEY=sk-... node scripts/generate-categories.mjs
 *
 * Output: prints TypeScript source for packages/core/src/data/item-categories.ts
 * to stdout. Review the output, then copy it into the data file — the committed
 * data is human-reviewed, and this script only drafts it.
 *
 * Calls the API directly rather than through src/lib/ai: this is a plain .mjs run
 * by node, outside the Next build and its path aliases.
 */

const API_URL = 'https://tokenhub.tencentmaas.com/v1/chat/completions';

/** Same text model the live classifier uses, so the drafts match what users get. */
const MODEL = 'hy3';

const CATEGORIES = [
  {
    id: 'paper',
    label: 'Paper & Cardboard',
    icon: '📄',
    items: [
      'Newspaper', 'Cardboard Box', 'Magazine', 'Office Paper',
      'Envelope', 'Paper Bag', 'Egg Carton (Paper)', 'Milk Carton / Tetra Pak',
    ],
  },
  {
    id: 'plastic',
    label: 'Plastic',
    icon: '♻️',
    items: [
      'PET Bottle', 'Plastic Container', 'Plastic Bag (Clean)',
      'Shampoo Bottle', 'Yoghurt Cup', 'Styrofoam', 'Cling Wrap',
    ],
  },
  {
    id: 'metal',
    label: 'Metal',
    icon: '🔧',
    items: [
      'Aluminium Can', 'Tin Can', 'Metal Lid',
      'Aerosol Can (Empty)', 'Aluminium Foil (Clean)',
    ],
  },
  {
    id: 'glass',
    label: 'Glass',
    icon: '🫙',
    items: [
      'Glass Bottle', 'Glass Jar', 'Wine Bottle',
      'Mirror', 'Pyrex / Ceramic',
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics',
    icon: '💻',
    items: [
      'Laptop', 'Mobile Phone', 'Tablet', 'TV / Monitor',
      'Printer', 'Cables & Chargers', 'Power Bank',
    ],
  },
  {
    id: 'batteries',
    label: 'Batteries',
    icon: '🔋',
    items: [
      'AA / AAA Battery', 'Button Cell Battery',
      'Lithium-Ion Battery', 'Car Battery',
    ],
  },
  {
    id: 'textile',
    label: 'Textile & Clothes',
    icon: '👕',
    items: [
      'T-Shirt', 'Jeans', 'Shoes', 'Handbag',
      'Curtains', 'Bedsheets',
    ],
  },
  {
    id: 'lighting',
    label: 'Lighting',
    icon: '💡',
    items: [
      'Fluorescent Tube', 'CFL Bulb', 'LED Bulb', 'Incandescent Bulb',
    ],
  },
  {
    id: 'hazardous',
    label: 'Hazardous Waste',
    icon: '⚠️',
    items: [
      'Paint', 'Pesticide', 'Motor Oil',
      'Cleaning Chemical', 'Expired Medicine',
    ],
  },
  {
    id: 'furniture',
    label: 'Furniture & Bulky',
    icon: '🛋️',
    items: [
      'Sofa', 'Mattress', 'Table', 'Chair', 'Bookshelf',
    ],
  },
];

const SYSTEM_PROMPT = `You are a recycling assistant for Singapore. Given an item name, classify it into the correct recycling channel according to NEA (National Environment Agency) guidelines.

## Recycling Channels

| Channel | What goes here | Examples |
|---------|---------------|----------|
| blue_bin | Clean & dry recyclables: paper, plastic, metal, glass | Newspapers, PET bottles, aluminum cans, glass jars |
| return_point | BCRS-eligible beverage containers (S$0.10 refund) | Plastic bottles, aluminum cans (150ml-3L, Deposit Mark visible, barcode intact, not crushed) |
| ewaste | Regulated e-waste (ICT equipment, large appliances) | Laptops, phones, TVs, fridges, washing machines, printers |
| ewaste_battery | Batteries of all types | AA/AAA batteries, button cells, lithium-ion batteries, car batteries |
| lighting | Fluorescent tubes and bulbs | CFL bulbs, fluorescent tubes, LED bulbs |
| textile | Clothes, shoes, bags in reusable condition | T-shirts, jeans, shoes, handbags, curtains |
| hazardous | Toxic or dangerous waste | Paint, pesticides, motor oil, cleaning chemicals, expired medicine |
| bulky_waste | Large items that don't fit in bins | Furniture, mattresses, large appliances (non-e-waste) |
| donation | Items in good condition that can be reused | Working electronics, good clothes, books, toys |
| general_waste | Non-recyclable items | Food waste, dirty/contaminated packaging, styrofoam, tissue paper |

## Classification Rules

1. Blue bin items MUST be clean and dry. A pizza box with grease stains → general_waste, NOT blue_bin.
2. Tissue paper and toilet paper → always general_waste.
3. Styrofoam → general_waste (not recyclable in Singapore).
4. Plastic bags → blue_bin ONLY if clean and dry.
5. Tetra Pak / milk cartons → blue_bin (recyclable in Singapore).
6. Ceramics, mirrors, pyrex → general_waste.
7. BCRS return_point is ONLY for beverage containers when the Deposit Mark is clearly visible or explicitly stated, and the item otherwise matches BCRS rules (plastic/metal, 150ml-3L, barcode intact, not crushed).
8. Do NOT guess return_point just because an item looks like a drink bottle/can. If Deposit Mark is not visible or not mentioned, do NOT use return_point.
9. If it is likely a beverage bottle/can but Deposit Mark is unknown, prefer blue_bin and mention in reason or tip: if the container has a Deposit Mark, bring it to a Return Point.
10. Glass beverage bottles, cartons, and pouches are NOT return_point.
11. E-waste batteries must go to ewaste_battery, NOT blue_bin or general_waste.
12. When in doubt, return status "not_sure" with confidence < 0.5. Do NOT guess.
13. Items in good, reusable condition (clothes, electronics, books) → consider "donation" or "consider_donating".
14. Incandescent bulbs → general_waste (not hazardous, not recyclable).

## Output Format

Respond ONLY with a valid JSON object (no markdown, no explanation):

{
  "item": "identified item name",
  "status": "recyclable|special_handling|consider_donating|not_recyclable|not_sure",
  "confidence": 0.0-1.0,
  "channel": "channel_name or null",
  "reason": "brief explanation in English",
  "preparation": ["step 1", "step 2"],
  "tip": "extra helpful tip (optional)"
}

Write Singapore dollar amounts with the "S$" prefix — the BCRS refund is S$0.10, never $0.10.
All text fields must be in English. Keep responses concise and practical.`;

const VALID_STATUSES = new Set([
  'recyclable',
  'special_handling',
  'consider_donating',
  'not_recyclable',
  'not_sure',
]);

const VALID_CHANNELS = new Set([
  'blue_bin',
  'return_point',
  'ewaste',
  'ewaste_battery',
  'lighting',
  'textile',
  'hazardous',
  'bulky_waste',
  'donation',
  'general_waste',
]);

const MAX_ATTEMPTS = 3;

function validateResult(result, itemName) {
  const valid = result
    && typeof result === 'object'
    && typeof result.item === 'string'
    && result.item.trim().length > 0
    && VALID_STATUSES.has(result.status)
    && Number.isFinite(result.confidence)
    && result.confidence >= 0
    && result.confidence <= 1
    && (result.channel === null || VALID_CHANNELS.has(result.channel))
    && typeof result.reason === 'string'
    && result.reason.trim().length > 0
    && (result.preparation === undefined
      || (Array.isArray(result.preparation) && result.preparation.every((step) => typeof step === 'string')))
    && (result.tip === undefined || typeof result.tip === 'string');

  if (!valid) {
    throw new Error(`Invalid classification for "${itemName}": ${JSON.stringify(result).slice(0, 300)}`);
  }
  return result;
}

async function waitBeforeRetry(itemName, attempt, delayMs, error) {
  console.error(
    `  ↻ ${itemName}: ${error.message.slice(0, 100)}; retry ${attempt + 1}/${MAX_ATTEMPTS} in ${delayMs}ms`,
  );
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function classifyItem(apiKey, itemName) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let res;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(20_000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Classify this item: ${itemName}\n\nRespond in English.` },
          ],
          max_tokens: 1024,
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      });
    } catch (err) {
      lastError = new Error(`Request failed for "${itemName}": ${err.message}`);
      if (attempt === MAX_ATTEMPTS) throw lastError;
      await waitBeforeRetry(itemName, attempt, 500 * (2 ** (attempt - 1)), lastError);
      continue;
    }

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      lastError = new Error(`API error for "${itemName}": ${res.status} ${detail}`);
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS) throw lastError;

      const retryAfter = res.headers.get('Retry-After');
      const retryAfterSeconds = retryAfter === null || retryAfter.trim() === ''
        ? Number.NaN
        : Number(retryAfter);
      const delayMs = res.status === 429 && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
        ? retryAfterSeconds * 1_000
        : res.status === 504 ? 0 : 500 * (2 ** (attempt - 1));
      await waitBeforeRetry(itemName, attempt, delayMs, lastError);
      continue;
    }

    try {
      const response = await res.json();
      const text = response.choices?.[0]?.message?.content;
      if (typeof text !== 'string') {
        throw new Error(`No text response for "${itemName}"`);
      }
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error(`Non-JSON response for "${itemName}": ${text.slice(0, 200)}`);
      return validateResult(JSON.parse(match[0]), itemName);
    } catch (err) {
      lastError = err;
      if (attempt === MAX_ATTEMPTS) throw lastError;
      await waitBeforeRetry(itemName, attempt, 500 * (2 ** (attempt - 1)), lastError);
    }
  }

  throw lastError ?? new Error(`Classification failed for "${itemName}"`);
}

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function toTS(result) {
  const prep = result.preparation
    ? `[${result.preparation.map(s => `'${escapeStr(s)}'`).join(', ')}]`
    : 'undefined';
  const tip = result.tip ? `'${escapeStr(result.tip)}'` : 'undefined';
  const channel = result.channel ? `'${result.channel}'` : 'null';

  return `{
          item: '${escapeStr(result.item)}',
          status: '${result.status}',
          confidence: ${result.confidence},
          channel: ${channel},
          reason: '${escapeStr(result.reason)}',
          preparation: ${prep},
          tip: ${tip},
        }`;
}

async function main() {
  const apiKey = process.env.TOKENHUB_API_KEY;
  if (!apiKey) {
    console.error('Error: TOKENHUB_API_KEY environment variable is required');
    process.exit(1);
  }

  const results = [];

  for (const cat of CATEGORIES) {
    console.error(`\n--- ${cat.label} ---`);
    const items = [];

    for (const itemName of cat.items) {
      try {
        const result = await classifyItem(apiKey, itemName);
        console.error(`  ✓ ${itemName}: ${result.status} / ${result.channel}`);
        items.push({ name: itemName, result });
      } catch (err) {
        console.error(`  ✗ ${itemName}: ${err.message}`);
        items.push({ name: itemName, result: null });
      }
      // Rate limit: 200ms between calls
      await new Promise(r => setTimeout(r, 200));
    }

    results.push({ ...cat, items });
  }

  // Output TypeScript
  let ts = `import type { ClassifyResult } from '../types/classify';\n\n`;
  ts += `export interface CategoryItem {\n  name: string;\n  result: ClassifyResult;\n}\n\n`;
  ts += `export interface ItemCategory {\n  id: string;\n  label: string;\n  icon: string;\n  items: CategoryItem[];\n}\n\n`;
  ts += `export const ITEM_CATEGORIES: ItemCategory[] = [\n`;

  for (const cat of results) {
    ts += `  {\n    id: '${cat.id}',\n    label: '${cat.label}',\n    icon: '${cat.icon}',\n    items: [\n`;
    for (const item of cat.items) {
      if (item.result) {
        ts += `      {\n        name: '${escapeStr(item.name)}',\n        result: ${toTS(item.result)},\n      },\n`;
      } else {
        ts += `      // FAILED: ${item.name} — needs manual entry\n`;
      }
    }
    ts += `    ],\n  },\n`;
  }

  ts += `];\n`;
  console.log(ts);
}

main();
