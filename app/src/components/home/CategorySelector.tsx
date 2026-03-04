'use client';

import { useState, useMemo } from 'react';
import type { ClassifyResult } from '@/lib/ai/types';
import type { ItemCategory } from '@/data/item-categories';
import type { Locale } from '@/lib/i18n/types';
import { getItemCategories } from '@/data/item-categories-i18n';

interface CategorySelectorProps {
  onSelect: (result: ClassifyResult) => void;
  disabled: boolean;
  locale: Locale;
}

export default function CategorySelector({ onSelect, disabled, locale }: CategorySelectorProps) {
  const categories = useMemo(() => getItemCategories(locale), [locale]);
  const [activeCategory, setActiveCategory] = useState<ItemCategory | null>(null);

  const handleCategoryClick = (cat: ItemCategory) => {
    setActiveCategory(cat);
  };

  const handleItemClick = (result: ClassifyResult) => {
    onSelect(result);
    setActiveCategory(null);
  };

  const handleBack = () => {
    setActiveCategory(null);
  };

  return (
    <div className="bg-white rounded-card border border-gray-100 overflow-hidden">
      {activeCategory ? (
        /* Item list for selected category */
        <div>
          <button
            onClick={handleBack}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-caption font-medium text-gray-600 border-b border-gray-100 active:bg-gray-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span>{activeCategory.icon} {activeCategory.label}</span>
          </button>
          <div className="max-h-48 overflow-y-auto">
            {activeCategory.items.map((item) => (
              <button
                key={item.name}
                onClick={() => handleItemClick(item.result)}
                disabled={disabled}
                className="w-full text-left px-4 py-2.5 text-body text-gray-700 border-b border-gray-50 last:border-b-0 active:bg-gray-50 disabled:opacity-50 min-h-[44px] flex items-center"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Category grid */
        <div className="grid grid-cols-2 gap-px bg-gray-100">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-3 bg-white text-caption text-gray-700 active:bg-gray-50 disabled:opacity-50 min-h-btn"
            >
              <span className="text-lg leading-none">{cat.icon}</span>
              <span className="text-left leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
