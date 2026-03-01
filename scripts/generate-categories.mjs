#!/usr/bin/env node
/**
 * Pre-generate ClassifyResult for all dropdown category items using Groq 70B.
 *
 * Usage:
 *   GROQ_API_KEY=gsk_... node scripts/generate-categories.mjs
 *
 * Output: prints TypeScript source for app/src/data/item-categories.ts to stdout.
 * Review the output, then copy it into the data file.
 */

import Groq from 'groq-sdk';

const MODEL = 'llama-3.3-70b-versatile';

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
| ewaste | Regulated e-waste (ICT equipment, large appliances) | Laptops, phones, TVs, fridges, washing machines, printers |
| ewaste_battery | Batteries of all types | AA/AAA batteries, button cells, lithium-ion batteries, car batteries |
| lighting | Fluorescent tubes and bulbs | CFL bulbs, fluorescent tubes, LED bulbs |
| textile | Clothes, shoes, bags in reusable condition | T-shirts, jeans, shoes, handbags, curtains |
| hazardous | Toxic or dangerous waste | Paint, pesticides, motor oil, cleaning chemicals, expired medicine |
| bulky_waste | Large items that don't fit in bins | Furniture, mattresses, large appliances (non-e-waste) |
| donation | Items in good condition that can be reused | Working electronics, good clothes, books, toys |
| general_waste | Non-recyclable items | Food waste, dirty/contaminated packaging, styrofoam, tissue paper |

## Classification Rules

1. Blue bin items MUST be clean and dry.
2. Tissue paper and toilet paper → always general_waste.
3. Styrofoam → general_waste (not recyclable in Singapore).
4. Plastic bags → blue_bin ONLY if clean and dry.
5. Tetra Pak / milk cartons → blue_bin (recyclable in Singapore).
6. Ceramics, mirrors, pyrex → general_waste.
7. E-waste batteries must go to ewaste_battery, NOT blue_bin or general_waste.
8. Incandescent bulbs → general_waste (not hazardous, not recyclable).

## Output Format

Respond ONLY with a valid JSON object (no markdown, no explanation):

{
  "item": "identified item name",
  "status": "recyclable|special_handling|consider_donating|not_recyclable|not_sure",
  "confidence": 0.0-1.0,
  "channel": "channel_name or null",
  "reason": "brief explanation in English",
  "preparation": ["step 1", "step 2"],
  "tip": "extra helpful tip"
}`;

async function classifyItem(client, itemName) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Classify this item for recycling in Singapore: ${itemName}` },
    ],
    max_tokens: 512,
  });

  const text = response.choices[0]?.message?.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Non-JSON response for "${itemName}": ${text.slice(0, 200)}`);
  return JSON.parse(match[0]);
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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('Error: GROQ_API_KEY environment variable is required');
    process.exit(1);
  }

  const client = new Groq({ apiKey });
  const results = [];

  for (const cat of CATEGORIES) {
    console.error(`\n--- ${cat.label} ---`);
    const items = [];

    for (const itemName of cat.items) {
      try {
        const result = await classifyItem(client, itemName);
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
  let ts = `import type { ClassifyResult } from '@/lib/ai/types';\n\n`;
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
