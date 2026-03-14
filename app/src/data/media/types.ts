export interface MediaArticle {
  slug: string;
  title: string;
  description: string;
  date: string;
  dateDisplay: string;
  readingTime: string;
  tags: string[];
  content: string;
  faq: { question: string; answer: string }[];
}
