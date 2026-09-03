import type { Metadata } from 'next';
import Link from 'next/link';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL } from '@binwhere/core';

/**
 * Privacy policy for the app and the website.
 *
 * Every statement here describes what the code actually does; when the code
 * changes (a new SDK, a new log field, a new provider) this page and the App
 * Privacy answers in App Store Connect change in the same commit. The date
 * below is the date of the last such change.
 */

const EFFECTIVE_DATE = '3 September 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What BinWhere does with the photos, descriptions and location you share, who processes them, and how long anything is kept.',
  alternates: { canonical: PRIVACY_POLICY_URL },
  openGraph: {
    title: 'Privacy Policy — BinWhere',
    description: 'What BinWhere does with the photos, descriptions and location you share.',
    url: PRIVACY_POLICY_URL,
    siteName: 'BinWhere',
    type: 'article',
  },
};

interface Row {
  data: string;
  why: string;
  how: string;
}

const DATA_ROWS: Row[] = [
  {
    data: 'Photos and text descriptions of items you want to recycle',
    why: 'To identify the item and give you recycling guidance.',
    how: 'Sent over HTTPS to our server, which passes the photo or text to our AI provider (TokenHub, operated by Tencent Cloud) to produce the answer. Our server does not store the photo or the text. It records only the outcome of the request: the category returned, a confidence score, the language, and how long the request took.',
  },
  {
    data: 'Your location, only if you allow it',
    why: 'To list recycling points near you.',
    how: 'Your coordinates are sent to our server for that one query. Our event records keep the position rounded to a grid cell of roughly 1 km, and the location parameters are removed from the web-server access log. Location is used only while the app is open, never in the background.',
  },
  {
    data: 'Network information (your IP address, device type, app version)',
    why: 'To run the service, limit abuse, and diagnose problems.',
    how: 'Your IP address is used in memory to apply request limits. Our application events store only a one-way hash of it that is reset every time the server restarts. The web-server access log records the IP address, the request path and the user agent; it is rotated automatically and only a bounded amount is ever kept.',
  },
  {
    data: 'Crash and error reports (app only)',
    why: 'To find and fix crashes, because a broken app cannot tell us otherwise.',
    how: 'If the app crashes or receives a response it cannot understand, a report is sent to Sentry (Functional Software, Inc.). It contains the error, the device model, the operating system and app version, and the last few actions in the app. We turn off Sentry’s collection of personal information, attach no screenshots, and strip location parameters from any web address in the report. The report carries a random identifier that the app creates when it is installed, so that we can count how many installations a crash affects; it is not linked to you and disappears when you uninstall the app. Sentry keeps reports for 90 days.',
  },
  {
    data: 'Website analytics (binwhere.sg only)',
    why: 'To see how the website is used.',
    how: 'The website uses Google Analytics, which sets cookies. The mobile app does not include Google Analytics or any other analytics library.',
  },
  {
    data: 'Your recent results',
    why: 'So you can reopen a result without scanning again.',
    how: 'Kept only on your device. Use “Clear” in the app to delete them, or uninstall the app.',
  },
];

interface Processor {
  name: string;
  role: string;
}

const PROCESSORS: Processor[] = [
  { name: 'TokenHub (Tencent Cloud)', role: 'AI model that identifies items from your photo or description.' },
  { name: 'Sentry (Functional Software, Inc.)', role: 'Crash and error reporting for the mobile app.' },
  { name: 'Cloudflare', role: 'Network security and content delivery in front of our server; it sees the same request data as our web server.' },
  { name: 'Amazon Web Services (Singapore region)', role: 'Hosting for our server.' },
  { name: 'Google Analytics', role: 'Website usage statistics, on binwhere.sg only.' },
  { name: 'Apple Maps / Google Maps', role: 'When you tap for directions, you leave BinWhere and the maps app’s own privacy policy applies.' },
];

export default function PrivacyPage() {
  return (
    <article className="max-w-[760px] mx-auto px-6 py-12 text-gray-700">
      <p className="text-sm font-medium text-[#00A651] tracking-wide uppercase mb-2">BinWhere</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-gray-500">Effective {EFFECTIVE_DATE}</p>

      <section className="mt-8 rounded-2xl bg-white border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900">In short</h2>
        <ul className="mt-3 space-y-2 text-base leading-relaxed list-disc pl-5">
          <li>BinWhere has no accounts and no sign-in. We do not know who you are.</li>
          <li>Photos and descriptions you submit are used to answer your question and are not stored by us.</li>
          <li>Your location is used only to find nearby recycling points; our records keep a ~1 km cell, never your exact position.</li>
          <li>The app reports crashes so we can fix them. Reports contain no personal information.</li>
          <li>We do not show ads, do not track you across other apps or websites, and do not sell data.</li>
        </ul>
      </section>

      <Section title="Who we are">
        <p>
          BinWhere is an independent, non-commercial recycling helper for Singapore, operated by an
          individual developer based in Singapore. You can reach us at{' '}
          <a className="text-[#0077B6] underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="What this policy covers">
        <p>
          This policy covers the BinWhere mobile app for iOS and Android, the web app and website at
          binwhere.sg, and the server that both use. Where something applies to only one of them, the
          text says so.
        </p>
      </Section>

      <Section title="Information we process, and why">
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-medium align-top w-1/4">Information</th>
                <th className="py-2 pr-4 font-medium align-top w-1/4">Why</th>
                <th className="py-2 font-medium align-top">What happens to it</th>
              </tr>
            </thead>
            <tbody>
              {DATA_ROWS.map((row) => (
                <tr key={row.data} className="border-b border-gray-100 align-top">
                  <td className="py-3 pr-4 font-medium text-gray-900">{row.data}</td>
                  <td className="py-3 pr-4">{row.why}</td>
                  <td className="py-3 leading-relaxed">{row.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="What we do not do">
        <ul className="space-y-2 list-disc pl-5">
          <li>We do not ask you to create an account, and we do not collect your name, email address or contact details unless you email us.</li>
          <li>We do not use your location in the background, and we never read your photo library: the app uses the camera live and only when you tap the shutter.</li>
          <li>We do not use advertising identifiers, fingerprinting, or any form of tracking across apps or websites.</li>
          <li>We do not sell, rent or share personal data for marketing.</li>
        </ul>
      </Section>

      <Section title="Who processes data on our behalf">
        <ul className="space-y-2">
          {PROCESSORS.map((p) => (
            <li key={p.name}>
              <span className="font-medium text-gray-900">{p.name}</span> — {p.role}
            </li>
          ))}
        </ul>
        <p className="mt-3">
          Recycling-point data comes from public datasets published by the National Environment Agency
          and data.gov.sg. No personal data is sent to them.
        </p>
      </Section>

      <Section title="How long we keep things">
        <ul className="space-y-2 list-disc pl-5">
          <li>Photos and descriptions: not stored.</li>
          <li>Application events (outcome, hashed client, ~1 km cell): kept in our server log, which is rotated automatically.</li>
          <li>Web-server access log (IP address, path, user agent): rotated automatically; at most a bounded number of files are kept.</li>
          <li>Crash reports: 90 days at Sentry.</li>
          <li>Recent results: on your device until you clear them or uninstall the app.</li>
        </ul>
      </Section>

      <Section title="Children">
        <p>
          BinWhere is suitable for all ages and collects no personal information from anyone. It is
          not directed at children under 13, and we do not knowingly collect personal data from them.
        </p>
      </Section>

      <Section title="Your choices">
        <ul className="space-y-2 list-disc pl-5">
          <li>You can withdraw camera or location access at any time in your device settings. Without location, the app still works; it just cannot list nearby points.</li>
          <li>You can delete your recent results in the app.</li>
          <li>Because we hold nothing that identifies you, we cannot look up or export data about a specific person. If you have a question or a request under Singapore’s Personal Data Protection Act, email us and we will respond.</li>
        </ul>
      </Section>

      <Section title="Security">
        <p>
          All traffic between the app, the website and our server is encrypted with HTTPS. Access to
          the server is restricted, and the credentials for our providers never leave it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          When we change how the app or website handles data, we update this page and the date at the
          top. Material changes will also be noted in the app’s release notes.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions, concerns or requests:{' '}
          <a className="text-[#0077B6] underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          See also our <Link className="text-[#0077B6] underline" href="/support">support page</Link>.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-base leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
