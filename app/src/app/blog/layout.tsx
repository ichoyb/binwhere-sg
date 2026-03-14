import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    template: '%s | BinWhere Blog',
    default: 'Blog — BinWhere',
  },
};

export default function MediaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="media-page min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[960px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/icons/binwhere-logo.png" alt="BinWhere" width={24} height={24} />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-[#00A651]">Bin</span>
              <span className="text-[#0077B6]">Where</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/blog"
              className="text-sm font-medium text-gray-600 hover:text-[#00A651] transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/"
              className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#00A651] hover:text-[#00A651] transition-colors"
            >
              Open App
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-[960px] mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/icons/binwhere-logo.png" alt="BinWhere" width={20} height={20} />
              <span className="text-sm font-bold tracking-tight">
                <span className="text-[#00A651]">Bin</span>
                <span className="text-[#0077B6]">Where</span>
              </span>
            </div>
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} BinWhere. Data sourced from NEA &amp; data.gov.sg.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
