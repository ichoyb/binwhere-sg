import { getItemCategories, type CategoryItem, type Locale } from '@binwhere/core';

export interface ItemSuggestion extends CategoryItem {
  categoryId: string;
  categoryLabel: string;
  icon: string;
}

export function getItemSuggestions(text: string, locale: Locale): ItemSuggestion[] {
  const query = text.trim().toLowerCase();
  if (!query) return [];

  const english = getItemCategories('en');
  const prefixes: ItemSuggestion[] = [];
  const others: ItemSuggestion[] = [];
  getItemCategories(locale).forEach((category, categoryIndex) => {
    category.items.forEach((item, itemIndex) => {
      const names = [item.name.toLowerCase()];
      if (locale !== 'en') names.push(english[categoryIndex].items[itemIndex].name.toLowerCase());
      if (!names.some((name) => name.includes(query))) return;
      const suggestion = { ...item, categoryId: category.id, categoryLabel: category.label, icon: category.icon };
      (names.some((name) => name.startsWith(query)) ? prefixes : others).push(suggestion);
    });
  });
  return [...prefixes, ...others];
}
