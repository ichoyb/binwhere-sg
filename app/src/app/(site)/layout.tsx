import type { Metadata } from 'next';
import { SiteChrome } from '@/components/site/SiteChrome';

export const metadata: Metadata = {
  title: {
    template: '%s | BinWhere',
    default: 'BinWhere',
  },
};

/** Legal and support pages: plain content inside the shared site chrome. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
