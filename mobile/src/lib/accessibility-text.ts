import { formatDistance, t, type ClassifyResult, type Locale, type LOCALE_OPTIONS, type RouteResponse } from '@binwhere/core';

export function answerHeaderLabel(result: ClassifyResult, locale: Locale) {
  const category = result.channel ? t(locale, `channel.${result.channel}`) : t(locale, `status.${result.status}`);
  const headline = result.next_action?.title
    ?? (result.channel ? t(locale, `instruction.${result.channel}`) : result.reason);
  return `${category}, ${result.item}, ${headline}`;
}

export function destinationAnnouncement(name: string, distanceKm: number, locale: Locale) {
  return `${name}, ${t(locale, 'map.straightLine')} · ${formatDistance(distanceKm)}`;
}

export function walkingRouteText(route: Pick<RouteResponse, 'distanceM' | 'durationS'>, locale: Locale) {
  return `${formatDistance(route.distanceM / 1000)} · ~${Math.max(1, Math.ceil(route.durationS / 60))} ${t(locale, 'shared.walk')}`;
}

const languageTags: Record<Locale, string> = { en: 'en', zh: 'zh-Hans', ms: 'ms', ta: 'ta' };

export function languageOptionAccessibility(option: (typeof LOCALE_OPTIONS)[number]) {
  return { accessibilityLabel: option.native, accessibilityLanguage: languageTags[option.value] };
}
