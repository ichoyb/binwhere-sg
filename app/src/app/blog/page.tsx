import type { Metadata } from 'next';
import Link from 'next/link';
import { articles } from '@/data/media';

export const metadata: Metadata = {
  title: 'Recycling Insights — BinWhere Blog',
  description:
    'Guides, tips, and news about recycling in Singapore. Learn how to recycle right with BinWhere.',
  openGraph: {
    title: 'Recycling Insights — BinWhere Blog',
    description: 'Guides, tips, and news about recycling in Singapore.',
    url: 'https://binwhere.sg/blog',
    siteName: 'BinWhere',
    type: 'website',
    images: [{ url: 'https://binwhere.sg/icons/icon-512.png', width: 512, height: 512, alt: 'BinWhere' }],
  },
  twitter: {
    card: 'summary',
    title: 'Recycling Insights — BinWhere Blog',
    description: 'Guides, tips, and news about recycling in Singapore.',
    images: ['https://binwhere.sg/icons/icon-512.png'],
  },
  alternates: {
    canonical: 'https://binwhere.sg/blog',
  },
};

const TAG_COLORS: Record<string, string> = {
  Recycling: 'bg-emerald-100 text-emerald-700',
  'Blue Bin': 'bg-sky-100 text-sky-700',
  'E-Waste': 'bg-amber-100 text-amber-700',
  Singapore: 'bg-red-100 text-red-700',
  Textile: 'bg-purple-100 text-purple-700',
  BCRS: 'bg-orange-100 text-orange-700',
};

export default function MediaPage() {
  return (
    <div className="max-w-[960px] mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <p className="text-sm font-medium text-[#00A651] tracking-wide uppercase mb-2">
          BinWhere Blog
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          Recycling Insights
        </h1>
        <p className="mt-3 text-base text-gray-500 max-w-lg mx-auto">
          Guides, tips, and news about recycling in Singapore. Making waste disposal smarter, one article at a time.
        </p>
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-[#00A651]/30 transition-all duration-200"
          >
            {/* Green accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-[#00A651] to-[#0077B6]" />
            <div className="p-6">
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {/* Title */}
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#00A651] transition-colors leading-snug">
                {article.title}
              </h2>
              {/* Excerpt */}
              <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                {article.description}
              </p>
              {/* Meta */}
              <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                <time dateTime={article.date}>{article.dateDisplay}</time>
                <span>&middot;</span>
                <span>{article.readingTime}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 text-center">
        <div className="inline-block bg-white rounded-2xl border border-gray-100 px-8 py-6">
          <p className="text-sm text-gray-500 mb-3">
            Not sure how to recycle something?
          </p>
          <a
            href="https://binwhere.sg"
            className="inline-block px-6 py-2.5 bg-[#00A651] text-white text-sm font-semibold rounded-xl hover:bg-[#00A651]/90 transition-colors"
          >
            Try BinWhere AI
          </a>
        </div>
      </div>
    </div>
  );
}
