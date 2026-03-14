/**
 * ============================================================
 * BinWhere Media Article Template
 * ============================================================
 *
 * Usage:
 *   1. Copy this file → rename to [slug].ts
 *   2. Replace all TEMPLATE_ placeholders
 *   3. Add import + entry in ../index.ts
 *   4. Run `cd app && npx tsc --noEmit` to verify
 *
 * Content guidelines:
 *   - 1500-2000 words, 4-6 H2 sections, 4 FAQ items
 *   - Primary keyword in: title, first paragraph, at least one H2
 *   - Include Singapore-specific data (bin counts, NEA references)
 *   - Mention BinWhere naturally in one section
 *   - End content with a link to https://binwhere.sg
 *
 * HTML elements for content field:
 *   <h2 id="section-id">   — major sections (4-6)
 *   <h3>                   — subsections
 *   <p>                    — paragraphs
 *   <ul>/<ol> + <li>       — lists
 *   <strong>               — bold/emphasis
 *   <em>                   — italic
 *   <a href="...">         — links
 * ============================================================
 */

import type { MediaArticle } from '../types';

export const TEMPLATE_EXPORT_NAME: MediaArticle = {
  // --- URL slug (kebab-case) ---
  slug: 'TEMPLATE_SLUG',

  // --- SEO title (50-65 chars, keyword near start) ---
  title: 'TEMPLATE_TITLE',

  // --- Meta description (150-160 chars) ---
  description: 'TEMPLATE_DESCRIPTION',

  // --- Dates ---
  date: 'YYYY-MM-DD',
  dateDisplay: 'Month DD, YYYY',

  // --- Reading time (~250 words/min) ---
  readingTime: 'X min read',

  // --- Tags (3-5 from: Recycling, Blue Bin, E-Waste, Singapore,
  //     Textile, BCRS, Zero Waste, NEA, Sustainability,
  //     Hazardous Waste, Donation) ---
  tags: ['TEMPLATE_TAG_1', 'TEMPLATE_TAG_2', 'TEMPLATE_TAG_3'],

  // --- FAQ (4 items, generates JSON-LD FAQPage schema) ---
  faq: [
    {
      question: 'TEMPLATE_FAQ_Q1?',
      answer: 'TEMPLATE_FAQ_A1',
    },
    {
      question: 'TEMPLATE_FAQ_Q2?',
      answer: 'TEMPLATE_FAQ_A2',
    },
    {
      question: 'TEMPLATE_FAQ_Q3?',
      answer: 'TEMPLATE_FAQ_A3',
    },
    {
      question: 'TEMPLATE_FAQ_Q4?',
      answer: 'TEMPLATE_FAQ_A4',
    },
  ],

  // --- Article body (HTML string) ---
  content: `
<p>TEMPLATE_INTRO — include primary keyword here. This opening paragraph
should be 2-3 sentences that hook the reader and establish context.</p>

<p>TEMPLATE_INTRO_CONTINUATION — expand on the topic, mention Singapore
specifics, set expectations for what the article covers.</p>

<h2 id="section-1">TEMPLATE_H2_1</h2>

<p>TEMPLATE_SECTION_1_CONTENT</p>

<ul>
  <li><strong>TEMPLATE_ITEM</strong>: Description</li>
  <li><strong>TEMPLATE_ITEM</strong>: Description</li>
  <li><strong>TEMPLATE_ITEM</strong>: Description</li>
</ul>

<h2 id="section-2">TEMPLATE_H2_2</h2>

<p>TEMPLATE_SECTION_2_CONTENT</p>

<h3>TEMPLATE_H3_SUBSECTION</h3>

<p>TEMPLATE_SUBSECTION_CONTENT</p>

<h2 id="section-3">TEMPLATE_H2_3</h2>

<p>TEMPLATE_SECTION_3_CONTENT</p>

<ol>
  <li><strong>TEMPLATE_STEP</strong>: Description</li>
  <li><strong>TEMPLATE_STEP</strong>: Description</li>
  <li><strong>TEMPLATE_STEP</strong>: Description</li>
</ol>

<h2 id="section-4">TEMPLATE_H2_4</h2>

<p>TEMPLATE_SECTION_4_CONTENT</p>

<h2 id="binwhere">How BinWhere Helps</h2>

<p>TEMPLATE_BINWHERE_SECTION — naturally describe how BinWhere solves
the problem discussed in this article.</p>

<p>Try it now at <a href="https://binwhere.sg">binwhere.sg</a> — no download required.</p>
`.trim(),
};
