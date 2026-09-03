import type { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT_EMAIL, SUPPORT_URL } from '@binwhere/core';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with the BinWhere app: contact, common questions, and what to include in a report.',
  alternates: { canonical: SUPPORT_URL },
  openGraph: {
    title: 'Support — BinWhere',
    description: 'Get help with the BinWhere app.',
    url: SUPPORT_URL,
    siteName: 'BinWhere',
    type: 'website',
  },
};

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  {
    q: 'The app says my location is outside Singapore.',
    a: 'Nearby recycling points are only available for Singapore, because that is where our datasets come from. Item identification and recycling guidance work anywhere.',
  },
  {
    q: 'The camera or location prompt did not appear, or I declined it.',
    a: 'Open Settings, find BinWhere, and switch Camera or Location back on. You can always type a description or pick the item from the list instead of using the camera.',
  },
  {
    q: 'The result looks wrong.',
    a: 'The AI can misidentify an item, especially from a dark or partial photo. Try a clearer photo or describe the item in words. If the guidance itself is wrong for Singapore, email us the item and what you expected; we correct the data.',
  },
  {
    q: 'Do I get the S$0.10 deposit back for every bottle or can?',
    a: 'Only containers carrying the Beverage Container Return Scheme deposit mark qualify, and they must be returned uncrushed with the barcode readable at a return point. The Blue Bin does not refund the deposit.',
  },
  {
    q: 'How do I delete my data?',
    a: 'There is no account and nothing on our server that identifies you. Your recent results live only on your phone: clear them in the app or uninstall it.',
  },
];

export default function SupportPage() {
  return (
    <article className="max-w-[760px] mx-auto px-6 py-12 text-gray-700">
      <p className="text-sm font-medium text-[#00A651] tracking-wide uppercase mb-2">BinWhere</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Support</h1>
      <p className="mt-3 text-base text-gray-500">
        BinWhere is built and supported by one person. Email is the fastest way to reach us.
      </p>

      <section className="mt-8 rounded-2xl bg-white border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900">Contact</h2>
        <p className="mt-2 text-base leading-relaxed">
          <a className="text-[#0077B6] underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        <p className="mt-3 text-sm text-gray-500">
          To help us reproduce a problem, include your device model, the iOS or Android version, the app
          version (shown in your phone’s app settings), what you did, and a screenshot if you have one.
          Please do not send photos of other people.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Common questions</h2>
        <dl className="space-y-6">
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <dt className="font-semibold text-gray-900">{faq.q}</dt>
              <dd className="mt-1 text-base leading-relaxed">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 text-sm text-gray-500">
        <p>
          How we handle your data is described in the{' '}
          <Link className="text-[#0077B6] underline" href="/privacy">privacy policy</Link>.
        </p>
      </section>
    </article>
  );
}
