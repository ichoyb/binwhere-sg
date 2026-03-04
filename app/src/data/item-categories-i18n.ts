import type { Locale } from '@/lib/i18n/types';
import { ITEM_CATEGORIES, type ItemCategory } from './item-categories';
import { ITEM_TRANSLATIONS } from './item-translations';

/**
 * Get item categories with translated text fields.
 * English returns original data; other locales overlay translations.
 */
export function getItemCategories(locale: Locale): ItemCategory[] {
  if (locale === 'en') return ITEM_CATEGORIES;

  const localeTranslations = ITEM_TRANSLATIONS[locale];
  if (!localeTranslations) return ITEM_CATEGORIES;

  return ITEM_CATEGORIES.map((cat) => {
    const catTranslation = localeTranslations[cat.id];
    if (!catTranslation) return cat;

    return {
      ...cat,
      label: catTranslation.label,
      items: cat.items.map((item) => {
        const itemTranslation = catTranslation.items[item.name];
        if (!itemTranslation) return item;

        return {
          ...item,
          name: itemTranslation.name,
          result: {
            ...item.result,
            item: itemTranslation.name,
            reason: itemTranslation.reason,
            preparation: itemTranslation.preparation,
            ...(itemTranslation.tip !== undefined ? { tip: itemTranslation.tip } : {}),
          },
        };
      }),
    };
  });
}
