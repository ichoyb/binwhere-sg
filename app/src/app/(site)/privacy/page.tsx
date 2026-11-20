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

const EFFECTIVE_DATE = '20 November 2026';

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
    how: 'Sent over HTTPS to our server, which passes it to TokenHub, a Tencent Cloud service. Tencent’s hy3 model answers text requests; Moonshot AI’s Kimi model (kimi-k3.1-pro-highspeed) answers photo requests, both through TokenHub. Tencent Cloud may process requests outside Singapore as computing resources are allocated across countries and regions. It moderates content and retains inputs and outputs for up to 30 days after a request. BinWhere does not store the photo or text. Our server records the category returned, confidence score, language and time taken. If an AI request fails, our logs also include up to 200 characters of the provider’s response or error message for troubleshooting.',
  },
  {
    data: 'Your location, only if you allow it',
    why: 'To list recycling points near you and calculate walking routes.',
    how: 'Your coordinates are sent to our server for a nearby query. If you choose an area manually, we send its centre instead of your device location. For walking routes, the app sends the starting point (device location or area centre) and the selected recycling point to our server. Our own routing service calculates the route; no map or routing provider receives these coordinates. Our event records keep only grid cells of roughly 1 km, and location parameters are removed from the web-server access log. The app’s basemap is bundled on your phone, so viewing it sends no request. Recycling-point lists are downloaded from our server and cached on your phone. Location is used only while the app is open, never in the background.',
  },
  {
    data: 'Network information (your IP address, device type, app version)',
    why: 'To run the service, limit abuse, and diagnose problems.',
    how: 'Your IP address is used in memory to apply request limits. Our application events store only a one-way hash of it that is reset every time the server restarts. The web-server access log records the IP address, the request path and the user agent; it is rotated automatically and only a bounded amount is ever kept.',
  },
  {
    data: 'Crash and error reports',
    why: 'To find and fix crashes, because a broken app cannot tell us otherwise.',
    how: 'If the app crashes or receives a response it cannot understand, a report is sent to Sentry (Functional Software, Inc.). It contains the error, the device model, the operating system and app version, and the last few actions in the app. We turn off Sentry’s collection of personal information, attach no screenshots, and strip location parameters from any web address in the report. The report carries a random identifier that the app creates when it is installed, so that we can count how many installations a crash affects; it is not linked to you and disappears when you uninstall the app. Our website server also reports unexpected errors and AI answers that do not meet the agreed format. Server reports contain the error type, code location and request path, or the anonymous fields already in our event records, such as a hashed client identifier and roughly 1 km grid cells. They contain no IP addresses, precise locations, photos or text descriptions. Sentry stores reports in its EU data centre in Frankfurt for 30 days.',
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
  { name: 'TokenHub (Tencent Cloud)', role: 'AI processing under our agreement with Tencent Cloud International Pte. Ltd. (Singapore). Tencent’s hy3 model handles text and Moonshot AI’s Kimi model handles photos through TokenHub. Processing may take place outside Singapore. Tencent Cloud moderates content and retains inputs and outputs for up to 30 days.' },
  { name: 'Sentry (Functional Software, Inc.)', role: 'Crash and error reporting for the mobile app and website server, stored in its EU data centre in Frankfurt for 30 days.' },
  { name: 'Cloudflare', role: 'Network security and content delivery in front of our server; it sees the same request data as our web server.' },
  { name: 'Amazon Web Services (Singapore region)', role: 'Hosting for BinWhere’s own server, separate from the AI processing described above.' },
  { name: 'Google Analytics', role: 'Website usage statistics, on binwhere.sg only.' },
  { name: 'Google Maps (website only)', role: 'Website directions links open Google Maps walking directions to the selected recycling point, under Google’s own privacy policy.' },
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
          <li>Photos and descriptions go through our server to Tencent Cloud’s TokenHub to answer your question. We do not store them; Tencent Cloud may process them outside Singapore and keeps inputs and outputs for up to 30 days.</li>
          <li>Your location is used to find nearby recycling points and calculate walking routes; our event records keep ~1 km cells, never your exact position.</li>
          <li>The app and website server report errors so we can fix them. Reports exclude IP addresses, precise locations, photos and descriptions, and are kept for 30 days in Sentry’s EU data centre in Frankfurt.</li>
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
          This policy covers the BinWhere mobile app for iPhone, the web app and website at
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
          <li>We do not use your location in the background. The app does not access your photo library: when you choose a photo, the iOS system picker gives the app only that selected photo. Location and other photo metadata are removed before it is sent.</li>
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
          We share data only with the service providers listed above. Under their respective data
          processing terms, they protect it to a standard no lower than that described in this policy.
          Recycling-point data comes from public datasets published by NEA through data.gov.sg under the{' '}
          <a className="text-[#0077B6] underline" href="https://data.gov.sg/open-data-licence" target="_blank" rel="noopener noreferrer">Singapore Open Data Licence</a>,
          Return Right (BCRS return points) and Cloop (textile recycling bins). Map and walking-route data
          comes from OpenStreetMap; see our <Link className="text-[#0077B6] underline" href="/data-license">data licences</Link>.
          No personal data is sent to them.
        </p>
      </Section>

      <Section title="How long we keep things">
        <ul className="space-y-2 list-disc pl-5">
          <li>Photos and descriptions: not stored by BinWhere. Tencent Cloud retains inputs and outputs for up to 30 days after a request and moderates content.</li>
          <li>Application events (outcome, hashed client, ~1 km cell): kept in our server log, which is rotated automatically. Failed AI requests may also log up to 200 characters of the provider’s response or error message; these logs rotate in the same way.</li>
          <li>Web-server access log (IP address, path, user agent): rotated automatically; at most a bounded number of files are kept.</li>
          <li>App crash and website server error reports: 30 days at Sentry’s EU data centre in Frankfurt.</li>
          <li>Recent results: on your device until you clear them or uninstall the app.</li>
        </ul>
      </Section>

      <Section title="Children">
        <p>
          BinWhere needs no account and is not directed at children under 13. We do not knowingly
          collect personal data from children under 13. The sections above describe what we process for every user.
        </p>
      </Section>

      <Section title="Your choices">
        <ul className="space-y-2 list-disc pl-5">
          <li>You can withdraw camera or location access at any time in your device settings. Without location access, BinWhere still identifies items, and in the iOS app you can choose a Singapore area by hand to find nearby points.</li>
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
