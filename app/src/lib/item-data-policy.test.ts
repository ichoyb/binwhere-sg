import assert from 'node:assert/strict';

import {
  getItemCategories,
  ITEM_CATEGORIES,
  ClassifyResultSchema,
  t,
  type ChannelType,
  type ClassifyStatus,
  type Locale,
} from '@binwhere/core';

interface PolicyExpectation {
  categoryId: string;
  itemName: string;
  channel: ChannelType | null;
  status: ClassifyStatus;
}

const POLICY_EXPECTATIONS: PolicyExpectation[] = [
  {
    categoryId: 'plastic',
    itemName: 'PET drink bottle',
    channel: 'return_point',
    status: 'recyclable',
  },
  {
    categoryId: 'metal',
    itemName: 'Aluminium drink can',
    channel: 'return_point',
    status: 'recyclable',
  },
  {
    categoryId: 'electronics',
    itemName: 'Power Bank',
    channel: 'ewaste',
    status: 'special_handling',
  },
  {
    categoryId: 'batteries',
    itemName: 'Car Battery',
    channel: 'hazardous',
    status: 'special_handling',
  },
  {
    categoryId: 'lighting',
    itemName: 'Incandescent Bulb',
    channel: 'lighting',
    status: 'special_handling',
  },
  {
    categoryId: 'hazardous',
    itemName: 'Expired Medicine',
    channel: 'general_waste',
    status: 'not_recyclable',
  },
  ...['T-Shirt', 'Jeans', 'Shoes', 'Handbag', 'Curtains', 'Bedsheets'].map(
    (itemName): PolicyExpectation => ({
      categoryId: 'textile',
      itemName,
      channel: 'textile',
      status: 'recyclable',
    }),
  ),
];

const LOCALES: Locale[] = ['en', 'zh', 'ms', 'ta'];

function findSourceItem(categoryId: string, itemName: string) {
  const category = ITEM_CATEGORIES.find(({ id }) => id === categoryId);
  assert.ok(category, `missing category: ${categoryId}`);

  const itemIndex = category.items.findIndex(({ name }) => name === itemName);
  assert.notEqual(itemIndex, -1, `missing item: ${categoryId}/${itemName}`);

  return { category, itemIndex };
}

for (const expectation of POLICY_EXPECTATIONS) {
  const { category, itemIndex } = findSourceItem(
    expectation.categoryId,
    expectation.itemName,
  );
  const sourceItem = category.items[itemIndex];

  assert.equal(sourceItem.result.channel, expectation.channel);
  assert.equal(sourceItem.result.status, expectation.status);

  for (const locale of LOCALES) {
    const localizedCategory = getItemCategories(locale).find(
      ({ id }) => id === expectation.categoryId,
    );
    assert.ok(localizedCategory, `${locale}: missing category ${expectation.categoryId}`);

    const localizedItem = localizedCategory.items[itemIndex];
    assert.ok(localizedItem, `${locale}: missing item at ${expectation.categoryId}/${itemIndex}`);
    assert.equal(localizedItem.result.channel, expectation.channel);
    assert.equal(localizedItem.result.status, expectation.status);
  }
}

for (const locale of LOCALES) {
  const categories = getItemCategories(locale);
  const electronics = categories.find(({ id }) => id === 'electronics');
  const lighting = categories.find(({ id }) => id === 'lighting');
  assert.ok(electronics && lighting);

  const powerBank = electronics.items[findSourceItem('electronics', 'Power Bank').itemIndex];
  const incandescent = lighting.items[findSourceItem('lighting', 'Incandescent Bulb').itemIndex];
  assert.match(powerBank.result.reason, /ICT/);

  const incandescentCopy = JSON.stringify(incandescent.result);
  const obsoleteGeneralWasteCopy: Record<Locale, RegExp> = {
    en: /Place in general waste bin/,
    zh: /放入普通垃圾箱/,
    ms: /Buang ke tong sampah biasa/,
    ta: /சாதாரணக் குப்பைத் தொட்டியில் போடவும்/,
  };
  assert.doesNotMatch(incandescentCopy, obsoleteGeneralWasteCopy[locale]);

  const allCopy = JSON.stringify(categories);
  assert.doesNotMatch(allCopy, /Watsons|Guardian/);
  assert.doesNotMatch(allCopy, /Even worn-out|即使是破旧|Tekstil lusuh pun|பழுதடைந்த துணிகளையும்/);
  assert.doesNotMatch(
    allCopy,
    /designated hazardous waste collection|指定有害废弃物收集点|pusat pengumpulan sisa berbahaya|ஆபத்தான கழிவு சேகரிப்புப் புள்ளிகளில்/,
  );
  assert.doesNotMatch(
    allCopy,
    /periodic hazardous waste collection|定期举办有害废弃物回收活动|kempen pengumpulan sisa berbahaya secara berkala|அவ்வப்போது ஆபத்தான கழிவு சேகரிப்பு/,
  );
}

const drinkNames: Record<Locale, [string, string]> = {
  en: ['PET drink bottle', 'Aluminium drink can'],
  zh: ['PET 饮料瓶', '铝制饮料罐'],
  ms: ['Botol minuman PET', 'Tin minuman aluminium'],
  ta: ['PET பான பாட்டில்', 'அலுமினிய பான கேன்'],
};
for (const locale of LOCALES) {
  const categories = getItemCategories(locale);
  for (const [index, categoryId, sourceName] of [
    [0, 'plastic', 'PET drink bottle'], [1, 'metal', 'Aluminium drink can'],
  ] as const) {
    const rendered = categories.find(({ id }) => id === categoryId)!.items[
      findSourceItem(categoryId, sourceName).itemIndex
    ];
    assert.equal(rendered.name, drinkNames[locale][index], `${locale}: translated lookup must not fall back`);
    assert.equal(rendered.result.item, drinkNames[locale][index]);
    assert.equal(rendered.result.reason, t(locale, 'bcrs.classifyReason'));
    assert.ok(rendered.result.reason.includes('S$0.10'));
    assert.ok(rendered.result.reason.includes('10¢ SG RETURN'));
    assert.equal(rendered.result.next_action, undefined);
    assert.equal(ClassifyResultSchema.safeParse(rendered.result).success, true);
  }
}

console.log('PASS reviewed disposal policy is consistent across all four locales');
