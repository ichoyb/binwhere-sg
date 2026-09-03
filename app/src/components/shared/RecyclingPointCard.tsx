'use client';

import type { ReactElement } from 'react';
import type { NearbyPoint } from '@/types/app';
import type { Locale } from '@/lib/i18n/types';
import { t, type TranslationKey } from '@/lib/i18n';
import NavigateButton from '@/components/shared/NavigateButton';
import { getNavigationUrl } from '@/lib/navigation';
import { formatDistance, estimateWalkTime } from '@/lib/format';

const ACCEPT_ICONS: Record<string, { icon: ReactElement; label: string }> = {
  'ICT equipment': {
    label: 'ICT',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>,
  },
  'Batteries': {
    label: 'Batteries',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="7" width="12" height="14" rx="1" /><path d="M10 3h4v4h-4z" /><path d="M10 14h4" /></svg>,
  },
  'Lamps': {
    label: 'Lamps',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" /><path d="M9 21h6" /></svg>,
  },
  'All regulated e-waste': {
    label: 'All e-waste',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 19a2 2 0 01-2-2V7l3-4h8l3 4v10a2 2 0 01-2 2H7z" /><path d="M12 7v6m0 2v2" /></svg>,
  },
  'Small appliances': {
    label: 'Appliances',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18h14V3H5z" /><circle cx="12" cy="16" r="2" /><path d="M9 7h6" /></svg>,
  },
};

const DONATION_ICONS: Record<string, { icon: ReactElement; label: string }> = {
  'Baby and children\'s Items': {
    label: 'Baby',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12a4 4 0 100-8 4 4 0 000 8z" /><path d="M12 12v4m-3 2h6a2 2 0 012 2H7a2 2 0 012-2z" /></svg>,
  },
  'Bags and accessories': {
    label: 'Bags',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 01-8 0" /></svg>,
  },
  'Books': {
    label: 'Books',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>,
  },
  'Clothing': {
    label: 'Clothing',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l-5 5 3 1 1 13h10l1-13 3-1-5-5c-1 1-2.5 2-4 2S9 3 8 2z" /></svg>,
  },
  'Food': {
    label: 'Food',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c-1 0-2 .5-2.5 1.5C8 5 5 7 5 11c0 5 3 10 7 10s7-5 7-10c0-4-3-6-4.5-7.5C14 2.5 13 2 12 2z" /><path d="M12 2c0 2-2 3-2 3" /></svg>,
  },
  'Furniture': {
    label: 'Furniture',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 11V6a2 2 0 012-2h10a2 2 0 012 2v5" /><path d="M3 11h18v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4z" /><path d="M5 17v4m14-4v4" /></svg>,
  },
  'Household goods': {
    label: 'Household',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M9 22V12h6v10" /></svg>,
  },
  'Large home appliances': {
    label: 'Appliances',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M4 10h16" /><path d="M8 6v2m0 4v4" /></svg>,
  },
  'Other electrical appliances': {
    label: 'Electrical',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5" /><path d="M9 7V2m6 5V2" /><path d="M6 7h12v4a6 6 0 01-12 0V7z" /></svg>,
  },
  'Shoes': {
    label: 'Shoes',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16s1-4 4-4 4 4 8 4 4-4 4-4v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-1z" /><path d="M6 12V6a2 2 0 012-2h1l1 3h4l1-3h1a2 2 0 012 2v6" /></svg>,
  },
  'Stationery': {
    label: 'Stationery',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>,
  },
  'Toys': {
    label: 'Toys',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1" /><circle cx="15.5" cy="8.5" r="1" /><circle cx="8.5" cy="15.5" r="1" /><circle cx="15.5" cy="15.5" r="1" /><circle cx="12" cy="12" r="1" /></svg>,
  },
};

const MACHINE_STATUS_CONFIG: Record<string, { key: TranslationKey; className: string }> = {
  PRE_LAUNCH: { key: 'bcrs.machinePreLaunch', className: 'bg-amber-50 text-amber-700' },
  ONLINE: { key: 'bcrs.machineOnline', className: 'bg-emerald-50 text-emerald-700' },
  OFFLINE: { key: 'bcrs.machineOffline', className: 'bg-slate-100 text-slate-600' },
  MAINTENANCE: { key: 'bcrs.machineMaintenance', className: 'bg-orange-50 text-orange-700' },
};

function AcceptsTags({ accepts }: { accepts: string }) {
  const items = accepts.split(/\s*,\s*/);
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map((item) => {
        const ewaste = ACCEPT_ICONS[item];
        if (ewaste) {
          return (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"
              title={item}
            >
              {ewaste.icon}
              <span className="text-[11px] leading-none">{ewaste.label}</span>
            </span>
          );
        }
        const donation = DONATION_ICONS[item];
        if (!donation) return null;
        return (
          <span
            key={item}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-50 text-pink-600"
            title={item}
          >
            {donation.icon}
            <span className="text-[11px] leading-none">{donation.label}</span>
          </span>
        );
      })}
    </div>
  );
}

interface RecyclingPointCardProps {
  point: NearbyPoint;
  heading?: string;
  locale?: Locale;
}

export default function RecyclingPointCard({ point, heading, locale = 'en' }: RecyclingPointCardProps) {
  const machineStatus = point.machineStatus ? MACHINE_STATUS_CONFIG[point.machineStatus] : undefined;

  return (
    <div className="bg-white rounded-card p-4 border border-gray-100">
      {heading && (
        <h3 className="text-caption font-semibold text-gray-700 mb-1.5">{heading}</h3>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <a
            href={getNavigationUrl(point.lat, point.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body font-medium text-blue-bin line-clamp-2 hover:underline"
          >
            {point.name}
          </a>
          {point.address && (
            <p className="text-caption text-gray-400 line-clamp-1 mt-0.5">{point.address}</p>
          )}
          {point.reuseType && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-pink-100 text-pink-700">
              {point.reuseType}
            </span>
          )}
          {(point.openingHours || machineStatus) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {point.openingHours && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  {t(locale, 'bcrs.openingHours')}: {point.openingHours}
                </span>
              )}
              {machineStatus && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${machineStatus.className}`}>
                  {t(locale, machineStatus.key)}
                </span>
              )}
            </div>
          )}
          {point.accepts && <AcceptsTags accepts={point.accepts} />}
          <p className="text-caption text-gray-500 mt-1">
            {formatDistance(point.distanceKm)} · ~{estimateWalkTime(point.distanceKm)} {t(locale, 'shared.walk')}
          </p>
        </div>
        <NavigateButton lat={point.lat} lng={point.lng} label={t(locale, 'shared.go')} />
      </div>
    </div>
  );
}
