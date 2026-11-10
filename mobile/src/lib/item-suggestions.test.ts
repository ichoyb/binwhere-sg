import assert from 'node:assert/strict';
import { getItemCategories, LOCALE_OPTIONS } from '@binwhere/core';
import { getItemSuggestions } from './item-suggestions';

const english = getItemCategories('en');
for (const { value: locale } of LOCALE_OPTIONS) {
  const categories = getItemCategories(locale);
  for (const [categoryIndex, category] of categories.entries()) {
    for (const [itemIndex, item] of category.items.entries()) {
      const localMatch = getItemSuggestions(item.name, locale).find(
        (match) => match.categoryId === category.id && match.name === item.name,
      );
      assert.ok(localMatch, `${locale}: ${item.name}`);
      assert.equal(localMatch.categoryLabel, category.label);
      assert.deepEqual(localMatch.result, item.result);
      if (locale !== 'en') {
        const englishName = english[categoryIndex].items[itemIndex].name;
        assert.ok(getItemSuggestions(englishName, locale).some(
          (match) => match.categoryId === category.id && match.name === item.name,
        ), `${locale}: English name ${englishName}`);
      }
    }
  }
  assert.deepEqual(getItemSuggestions('', locale), []);
  assert.deepEqual(getItemSuggestions(' \n ', locale), []);
}

assert.deepEqual(getItemSuggestions('  pApEr  ', 'en'), getItemSuggestions('paper', 'en'));
for (const [locale, name] of [
  ['en', 'Newspaper'], ['zh', '报纸'], ['ms', 'Surat Khabar'], ['ta', 'செய்தித்தாள்'],
] as const) {
  assert.equal(getItemSuggestions(name, locale)[0].name, name);
}
assert.deepEqual(getItemSuggestions('paper', 'en').map((item) => item.name), [
  'Paper Bag', 'Newspaper', 'Office Paper', 'Egg Carton (Paper)',
]);
assert.deepEqual(getItemSuggestions('PAPER', 'zh').map((item) => item.name), [
  '纸袋', '报纸', '办公用纸', '鸡蛋盒（纸质）',
]);
console.log('PASS suggestions match all four locales and English aliases, trim/case, stable prefix order and empty input');
