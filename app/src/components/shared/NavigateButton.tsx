'use client';

import { getNavigationUrl } from '@/lib/navigation';

interface NavigateButtonProps {
  lat: number;
  lng: number;
  label?: string;
  name?: string;
}

export default function NavigateButton({ lat, lng, label = 'Navigate', name }: NavigateButtonProps) {
  const url = getNavigationUrl(lat, lng, name);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-blue-bin text-white text-sm font-medium active:bg-blue-bin/90 min-h-[44px]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l19-9-9 19-2-8-8-2z"/>
      </svg>
      {label}
    </a>
  );
}
