import type { MetadataRoute } from 'next';
import { articles } from '@/data/media';

const BASE = 'https://binwhere.sg';

export default function sitemap(): MetadataRoute.Sitemap {
  const mediaArticles = articles.map((article) => ({
    url: `${BASE}/blog/${article.slug}`,
    lastModified: new Date(article.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${BASE}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    ...mediaArticles,
  ];
}
