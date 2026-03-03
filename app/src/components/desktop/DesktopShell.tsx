'use client';

import { type ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import LogoIcon from '@/components/shared/LogoIcon';

const SITE_URL = 'https://binwhere.sg';

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
const STATS = [
  { target: 12578, label: 'Blue Bins', suffix: '', prefix: '' },
  { target: 718, label: 'E-Waste Points', suffix: '', prefix: '' },
  { target: 401, label: 'Textile Bins', suffix: '', prefix: '' },
  { target: 3, label: 'AI Scan', suffix: 's', prefix: '<' },
] as const;

function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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

  const v0 = useAnimatedCounter(STATS[0].target, 1800, visible);
  const v1 = useAnimatedCounter(STATS[1].target, 1400, visible);
  const v2 = useAnimatedCounter(STATS[2].target, 1200, visible);
  const v3 = useAnimatedCounter(STATS[3].target, 800, visible);
  const values = [v0, v1, v2, v3];

  return (
    <div ref={ref} className="desktop-section border-t border-white/[0.06]">
      <div className="grid grid-cols-4 gap-8">
        {STATS.map((stat, i) => (
          <div key={stat.label} className="stat-card text-center">
            <p className="text-4xl font-bold text-white tracking-tight">
              {stat.prefix ?? ''}{values[i].toLocaleString()}{stat.suffix}
            </p>
            <p className="mt-2 text-sm text-gray-400">{stat.label}</p>
          </div>
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
    desc: 'Take a photo of the item or describe it in text.',
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
    desc: 'AI identifies the item and tells you how to recycle it.',
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

/* ── QR Popup ── */
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
export default function DesktopShell({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [qrOpen, setQrOpen] = useState(false);

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

      {/* Hero */}
      <section className="desktop-hero">
        <div className="desktop-hero-text">
          <p className="text-sm font-medium text-nea-green tracking-wide uppercase mb-4">Singapore Recycling Guide</p>
          <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
            Snap a photo.<br />
            Know how to recycle.<br />
            Find nearest bin.
          </h1>
          <p className="mt-6 text-lg text-gray-400 leading-relaxed">
            AI-powered recycling assistant covering 13,000+ collection points across Singapore.
          </p>
          <div className="mt-8">
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
          <div className="phone-notch" />
          <div className="phone-screen">
            {children}
          </div>
        </div>
      </section>

      {/* Stats */}
      <StatsSection />

      {/* Steps */}
      <StepsSection />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="max-w-[1200px] mx-auto px-12">
          <div className="grid grid-cols-3 gap-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LogoIcon size={20} />
                <span className="text-base font-bold tracking-tight">
                  <span className="text-emerald-400">Bin</span>
                  <span className="text-sky-400">Where</span>
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                AI-powered recycling assistant for Singapore. Snap, know, and find the nearest bin.
              </p>
            </div>
            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Connect</h4>
              <ul className="space-y-2">
                <li>
                  <a href="https://x.com/ichoyb" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    X
                  </a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/in/yuboinsg/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="mailto:ichoyb@gmail.com" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            {/* Data */}
            <div>
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Data Sources</h4>
              <ul className="space-y-2">
                <li>
                  <a href="https://www.nea.gov.sg" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-white transition-colors">
                    NEA
                  </a>
                </li>
                <li>
                  <a href="https://data.gov.sg" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-white transition-colors">
                    data.gov.sg
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/[0.06]">
            <p className="text-xs text-gray-600 text-center">&copy; {new Date().getFullYear()} BinWhere</p>
          </div>
        </div>
      </footer>

      {/* QR Popup */}
      <QRPopup open={qrOpen} onClose={closeQR} />
    </div>
  );
}
