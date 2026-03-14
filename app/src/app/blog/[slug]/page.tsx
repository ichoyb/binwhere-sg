import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticle, getAllSlugs } from '@/data/media';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.description,
    openGraph: {
      title: article.title,
      description: article.description,
      url: `https://binwhere.sg/blog/${article.slug}`,
      siteName: 'BinWhere',
      type: 'article',
      publishedTime: article.date,
      images: [{ url: 'https://binwhere.sg/icons/icon-512.png', width: 512, height: 512, alt: 'BinWhere' }],
    },
    twitter: {
      card: 'summary',
      title: article.title,
      description: article.description,
      images: ['https://binwhere.sg/icons/icon-512.png'],
    },
    alternates: {
      canonical: `https://binwhere.sg/blog/${article.slug}`,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    image: 'https://binwhere.sg/icons/icon-512.png',
    author: {
      '@type': 'Organization',
      name: 'BinWhere',
    },
    publisher: {
      '@type': 'Organization',
      name: 'BinWhere',
      url: 'https://binwhere.sg',
      logo: {
        '@type': 'ImageObject',
        url: 'https://binwhere.sg/icons/binwhere-logo.png',
      },
    },
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <article className="max-w-[720px] mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/blog" className="hover:text-[#00A651] transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-gray-600 truncate">{article.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#00A651]/10 text-[#00A651]"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
            {article.title}
          </h1>
          <div className="mt-4 flex items-center gap-3 text-sm text-gray-400">
            <time dateTime={article.date}>{article.dateDisplay}</time>
            <span>&middot;</span>
            <span>{article.readingTime}</span>
          </div>
        </header>

        {/* Body */}
        <div
          className="media-prose"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* FAQ */}
        {article.faq.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {article.faq.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-[#00A651] to-[#0077B6] rounded-2xl p-8 text-center text-white">
          <p className="text-lg font-bold mb-2">Not sure how to recycle something?</p>
          <p className="text-sm text-white/80 mb-4">
            Snap a photo and BinWhere AI will tell you exactly where it goes.
          </p>
          <a
            href="https://binwhere.sg"
            className="inline-block px-6 py-2.5 bg-white text-[#00A651] text-sm font-semibold rounded-xl hover:bg-white/90 transition-colors"
          >
            Try BinWhere AI
          </a>
        </div>

        {/* Back */}
        <div className="mt-8 text-center">
          <Link
            href="/blog"
            className="text-sm text-gray-400 hover:text-[#00A651] transition-colors"
          >
            &larr; All articles
          </Link>
        </div>
      </article>
    </>
  );
}
