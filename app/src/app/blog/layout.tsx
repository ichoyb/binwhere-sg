import type { Metadata } from 'next';
import { SiteChrome } from '@/components/site/SiteChrome';

export const metadata: Metadata = {
  title: {
    template: '%s | BinWhere Blog',
    default: 'Blog — BinWhere',
  },
};

export default function MediaLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
