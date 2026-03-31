import type { ClassifyResult } from './ai/types';
import { t } from './i18n';
import type { Locale } from './i18n/types';

interface OpeningHoursDayTime {
  day?: number;
  time?: string;
}

interface OpeningHoursPeriod {
  open?: OpeningHoursDayTime;
  close?: OpeningHoursDayTime;
}

export interface ReturnPointOpeningHours {
  alwaysOpen?: boolean;
  periods?: OpeningHoursPeriod[];
  weekdayText?: string[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function parseOpeningHours(input: unknown): ReturnPointOpeningHours | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as ReturnPointOpeningHours;
    } catch {
      return undefined;
    }
  }
  if (typeof input === 'object') {
    return input as ReturnPointOpeningHours;
  }
  return undefined;
}

function formatTime(input?: string): string | null {
  if (!input || !/^\d{4}$/.test(input)) return null;
  return `${input.slice(0, 2)}:${input.slice(2)}`;
}

function formatDayRange(startDay: number, endDay: number): string {
  const start = DAY_LABELS[startDay];
  const end = DAY_LABELS[endDay];
  return start === end ? start : `${start}-${end}`;
}

export function formatReturnPointOpeningHours(input: unknown): string | undefined {
  const openingHours = parseOpeningHours(input);
  if (!openingHours) return undefined;

  if (openingHours.alwaysOpen) return '24 Hours';

  const periods = openingHours.periods ?? [];
  const dayMap = new Map<number, string>();

  for (const period of periods) {
    const day = period.open?.day;
    const open = formatTime(period.open?.time);
    const close = formatTime(period.close?.time);
    if (typeof day !== 'number' || !open || !close) continue;
    dayMap.set(day, `${open} - ${close}`);
  }

  if (dayMap.size === 7) {
    const groups: Array<{ startDay: number; endDay: number; hours: string }> = [];

    for (let day = 0; day < 7; day++) {
      const hours = dayMap.get(day);
      if (!hours) continue;

      const last = groups[groups.length - 1];
      if (last && last.hours === hours && last.endDay === day - 1) {
        last.endDay = day;
      } else {
        groups.push({ startDay: day, endDay: day, hours });
      }
    }

    if (groups.length === 1) {
      return groups[0].hours;
    }

    return groups
      .map((group) => `${formatDayRange(group.startDay, group.endDay)} ${group.hours}`)
      .join(', ');
  }

  const fallback = openingHours.weekdayText?.[0];
  if (fallback) {
    const parts = fallback.split(': ');
    return parts[1] ?? fallback;
  }

  return undefined;
}

export function buildBcrsGuideResult(locale: Locale): ClassifyResult {
  return {
    item: t(locale, 'bcrs.guideItem'),
    status: 'recyclable',
    confidence: 1,
    channel: 'return_point',
    reason: t(locale, 'bcrs.entryDesc'),
    preparation: [],
    tip: t(locale, 'bcrs.excluded'),
  };
}
