'use client';

import { type ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import LogoIcon from '@/components/shared/LogoIcon';
import { SITE_URL, SUPPORT_EMAIL } from '@binwhere/core';
import type { GeoDataCounts } from '@/lib/data-gov';

/* ── Animated counter hook ── */
function useAnimatedCounter(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);

  return value;
}

/* ── Stats section ── */
interface Stat {
  target: number;
  label: string;
  suffix: string;
  prefix: string;
  color: string;
}

function StatCard({ stat, visible }: { stat: Stat; visible: boolean }) {
  const value = useAnimatedCounter(stat.target, 1_400, visible);

  return (
    <div className="stat-card text-center">
      <p className="text-4xl font-bold tracking-tight" style={{ color: stat.color }}>
        {stat.prefix}{value.toLocaleString('en-SG')}{stat.suffix}
      </p>
      <p className="mt-2 text-sm text-gray-400">{stat.label}</p>
    </div>
  );
}

function StatsSection({ dataCounts }: { dataCounts: GeoDataCounts }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const stats: Stat[] = [
    { target: dataCounts.recyclingBins, label: 'Blue Bins', suffix: '', prefix: '', color: '#0077B6' },
    { target: dataCounts.ewaste, label: 'E-Waste Points', suffix: '', prefix: '', color: '#00897B' },
    { target: dataCounts.textile, label: 'Textile Bins', suffix: '', prefix: '', color: '#D4A017' },
    { target: dataCounts.reuseChannels, label: 'Donation Points', suffix: '', prefix: '', color: '#8E24AA' },
    { target: dataCounts.returnPoints, label: 'Return Points', suffix: '', prefix: '', color: '#00A651' },
    { target: 3, label: 'AI Recognition', suffix: 's', prefix: '<', color: '#FFFFFF' },
  ];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="desktop-section border-t border-white/[0.06]">
      <div className="grid grid-cols-6 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} visible={visible} />
        ))}
      </div>
    </div>
  );
}

/* ── Steps section ── */
const STEPS = [
  {
    num: '01',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00A651" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    title: 'Snap',
    desc: 'Take a photo or describe it — AI accepts both.',
  },
  {
    num: '02',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00A651" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
    title: 'Know',
    desc: 'BinWhere AI classifies the item and gives disposal instructions.',
  },
  {
    num: '03',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00A651" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    title: 'Go',
    desc: 'Navigate to the nearest recycling point in Singapore.',
  },
];

function StepsSection() {
  return (
    <div id="how-it-works" className="desktop-section border-t border-white/[0.06]">
      <h2 className="text-center text-2xl font-bold text-white mb-12">How It Works</h2>
      <div className="grid grid-cols-3 gap-12">
        {STEPS.map((step) => (
          <div key={step.num} className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.06] mb-4">
              {step.icon}
            </div>
            <p className="text-xs font-mono text-nea-green/60 mb-1">{step.num}</p>
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── BCRS Announcement Bar (below nav, above hero) ── */
function BcrsAnnouncementBar({
  onClick,
  returnPointCount,
}: {
  onClick: () => void;
  returnPointCount: number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-emerald-950/40 border-b border-emerald-400/10 hover:bg-emerald-950/60 transition-colors cursor-pointer"
    >
      <div className="max-w-[1200px] mx-auto px-12 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider">BCRS</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-200 font-medium">
              Beverage Container Return Scheme — S$0.10 refund per container
            </span>
            <span className="text-xs text-gray-500">
              {returnPointCount.toLocaleString('en-SG')} Return Points island-wide · Plastic & metal containers · 150ml – 3L · Deposit Mark required
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-emerald-400/70 shrink-0 ml-6">
          <span className="text-xs font-medium">Find Return Point</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </button>
  );
}

function QRPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <QRCodeSVG value={SITE_URL} size={180} />
        <p className="mt-4 text-sm font-medium text-gray-700">Scan to open on your phone</p>
        <p className="mt-1 text-xs text-gray-400">{SITE_URL}</p>
      </div>
    </div>
  );
}

/* ── Main DesktopShell ── */
export default function DesktopShell({
  children,
  dataCounts,
}: {
  children: ReactNode;
  dataCounts: GeoDataCounts;
}) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [qrOpen, setQrOpen] = useState(false);
  const totalLocationCount = Object.values(dataCounts)
    .reduce((total, count) => total + count, 0);

  const openQR = useCallback(() => setQrOpen(true), []);
  const closeQR = useCallback(() => setQrOpen(false), []);

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <div className="desktop-shell">
      {/* Nav */}
      <nav className="desktop-nav">
        <div className="max-w-[1200px] mx-auto px-12 w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoIcon size={28} />
            <span className="text-xl font-bold tracking-tight">
              <span className="text-emerald-400">Bin</span>
              <span className="text-sky-400">Where</span>
            </span>
          </div>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg hover:border-white/20 transition-colors"
          >
            How It Works
          </button>
        </div>
      </nav>

      {/* BCRS Announcement */}
      <BcrsAnnouncementBar
        onClick={openQR}
        returnPointCount={dataCounts.returnPoints}
      />

      {/* Hero */}
      <section className="desktop-hero">
        <div className="desktop-hero-text">
          <p className="text-sm font-medium text-nea-green tracking-wide uppercase mb-4">Singapore&apos;s AI Recycling Guide</p>
          <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
            Snap a photo.<br />
            AI shows how to recycle.<br />
            Find nearest bin.
          </h1>
          <p className="mt-6 text-base text-gray-400 leading-relaxed">
            BinWhere AI identifies your item in seconds — with disposal guidance and navigation to {totalLocationCount.toLocaleString('en-SG')} recycling points across Singapore.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['BinWhere AI', '~3s Text Recognition', '4 Languages'].map((tag) => (
              <span key={tag} className="border border-white/15 text-xs text-gray-400 rounded-full px-3 py-1">{tag}</span>
            ))}
          </div>
          <div className="mt-6">
            <button
              onClick={openQR}
              className="px-6 py-3 bg-nea-green text-white font-semibold rounded-xl hover:bg-nea-green/90 transition-colors"
            >
              Try on Phone
            </button>
          </div>
        </div>

        {/* Phone frame */}
        <div className="phone-frame">
          <div className="phone-screen">
            {children}
          </div>
        </div>
      </section>

      {/* Stats */}
      <StatsSection dataCounts={dataCounts} />

      {/* Steps */}
      <StepsSection />

      {/* Footer */}
      <footer className="desktop-section border-t border-white/[0.06] !py-12">
          {/* Resources — 4 card grid */}
          <div className="grid grid-cols-4 gap-4 mb-10">
            {[
              { href: '/blog', title: 'Blog', desc: 'Recycling tips & guides', color: '#00A651',
                icon: 'M4 4h16v16H4zM8 2v4M16 2v4M4 10h16' },
              { href: 'https://www.nea.gov.sg', title: 'NEA', desc: 'National Environment Agency', color: '#0077B6', external: true,
                icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6' },
              { href: 'https://data.gov.sg', title: 'data.gov.sg', desc: 'Open data source', color: '#8E24AA', external: true,
                icon: 'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zM9 12h6M9 16h3' },
              { href: 'https://returnright.sg', title: 'Return Right', desc: 'BCRS scheme operator', color: '#00897B', external: true,
                icon: 'M4 12a8 8 0 0113.86-5.66M20 12a8 8 0 01-13.86 5.66M17 3v4h-4M7 21v-4h4M12 8v8m-3-4h6' },
            ].map((r) => (
              <a
                key={r.title}
                href={r.href}
                {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group rounded-2xl bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${r.color}15` }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={r.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={r.icon} />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{r.title}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{r.desc}</p>
              </a>
            ))}
          </div>

          {/* Brand + Connect */}
          <div className="flex items-center justify-between pt-8">
            <div className="flex items-center gap-3">
              <LogoIcon size={20} />
              <div>
                <span className="text-base font-bold tracking-tight">
                  <span className="text-emerald-400">Bin</span>
                  <span className="text-sky-400">Where</span>
                </span>
                <p className="text-xs text-gray-600">Singapore&apos;s AI recycling guide</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://x.com/ichoyb" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-white transition-colors" aria-label="X">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.linkedin.com/in/yuboinsg/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-white transition-colors" aria-label="LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gray-600 hover:text-white transition-colors" aria-label="Email">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>
              </a>
            </div>
          </div>

          {/* Copyright + legal */}
          <div className="mt-6 pt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs text-gray-700">
            <p>&copy; {new Date().getFullYear()} BinWhere</p>
            <nav className="flex items-center gap-4" aria-label="Legal">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/support" className="hover:text-white transition-colors">Support</a>
            </nav>
          </div>
      </footer>

      {/* QR Popup */}
      <QRPopup open={qrOpen} onClose={closeQR} />
    </div>
  );
}
