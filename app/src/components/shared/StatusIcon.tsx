'use client';

import type { ClassifyStatus } from '@/types/recycling';
import { STATUS_CONFIG } from '@/lib/constants';

interface StatusIconProps {
  status: ClassifyStatus;
  size?: number;
}

export default function StatusIcon({ status, size = 40 }: StatusIconProps) {
  const config = STATUS_CONFIG[status];

  const iconPath: Record<ClassifyStatus, string> = {
    recyclable: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    special_handling: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    consider_donating: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    not_recyclable: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
    not_sure: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01',
  };

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: config.bgColor,
      }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke={config.color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={iconPath[status]} />
      </svg>
    </div>
  );
}
