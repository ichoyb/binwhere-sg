'use client';

import type { NearbyPoint } from '@/types/app';
import NavigateButton from '@/components/shared/NavigateButton';
import { formatDistance, estimateWalkTime } from '@/lib/format';

const ACCEPT_ICONS: Record<string, { icon: JSX.Element; label: string }> = {
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

function AcceptsTags({ accepts }: { accepts: string }) {
  const items = accepts.split(', ');
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map((item) => {
        const config = ACCEPT_ICONS[item];
        if (!config) return null;
        return (
          <span
            key={item}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"
            title={item}
          >
            {config.icon}
            <span className="text-[11px] leading-none">{config.label}</span>
          </span>
        );
      })}
    </div>
  );
}

interface RecyclingPointCardProps {
  point: NearbyPoint;
  heading?: string;
}

export default function RecyclingPointCard({ point, heading }: RecyclingPointCardProps) {
  return (
    <div className="bg-white rounded-card p-4 border border-gray-100">
      {heading && (
        <h3 className="text-caption font-semibold text-gray-700 mb-1.5">{heading}</h3>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium text-gray-900 line-clamp-2">{point.name}</p>
          {point.address && (
            <p className="text-caption text-gray-400 line-clamp-1 mt-0.5">{point.address}</p>
          )}
          {point.accepts && <AcceptsTags accepts={point.accepts} />}
          <p className="text-caption text-gray-500 mt-1">
            {formatDistance(point.distanceKm)} · ~{estimateWalkTime(point.distanceKm)} min walk
          </p>
        </div>
        <NavigateButton lat={point.lat} lng={point.lng} name={point.name} label="Go" />
      </div>
    </div>
  );
}
