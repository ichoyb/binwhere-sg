import assert from 'node:assert/strict';

import {
  getItemCategories,
  ITEM_CATEGORIES,
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
    itemName: 'PET Bottle',
    channel: null,
    status: 'not_sure',
  },
  {
    categoryId: 'metal',
    itemName: 'Aluminium Can',
    channel: null,
    status: 'not_sure',
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

console.log('PASS reviewed disposal policy is consistent across all four locales');
