export type { MediaArticle } from './types';

import { bcrsBeverageContainerReturnSchemeSingapore2026 } from './articles/bcrs-beverage-container-return-scheme-singapore-2026';
import { recyclingGuideSingapore2026 } from './articles/recycling-guide-singapore-2026';
import type { MediaArticle } from './types';

export const articles: MediaArticle[] = [
  bcrsBeverageContainerReturnSchemeSingapore2026,
  recyclingGuideSingapore2026,
];

export function getArticle(slug: string): MediaArticle | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getAllSlugs(): string[] {
  return articles.map((a) => a.slug);
}
