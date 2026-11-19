import assert from 'node:assert/strict';
import { buildBcrsGuideResult, LOCALE_OPTIONS, t, type ClassifyResult, type Locale } from '@binwhere/core';
import { answerHeaderLabel, destinationAnnouncement, languageOptionAccessibility, walkingRouteText } from './accessibility-text';

const paper: ClassifyResult = {
  item: 'Newspaper', status: 'recyclable', channel: 'blue_bin', confidence: 0.95, reason: 'Clean paper',
};

for (const locale of ['en', 'zh', 'ms', 'ta'] as const) {
  assert.equal(answerHeaderLabel(paper, locale),
    `${t(locale, 'channel.blue_bin')}, Newspaper, ${t(locale, 'instruction.blue_bin')}`);
  assert.equal(answerHeaderLabel({ ...paper, status: 'not_sure', channel: null }, locale),
    `${t(locale, 'status.not_sure')}, Newspaper, Clean paper`);
  const guide = buildBcrsGuideResult(locale);
  const action = { ...guide, next_action: { type: 'return_container' as const, title: 'Return this container',
    instruction: 'Keep intact', qualification: 'Barcode checked at return point', channel: 'return_point' as const } };
  assert.equal(answerHeaderLabel(action, locale), `${t(locale, 'channel.return_point')}, ${guide.item}, Return this container`);
  assert.equal(destinationAnnouncement('AMK Return Point', 0.25, locale),
    `AMK Return Point, ${t(locale, 'map.straightLine')} · 250m`);
  assert.equal(walkingRouteText({ distanceM: 1500, durationS: 121 }, locale), `1.5km · ~3 ${t(locale, 'shared.walk')}`);
  assert.equal(walkingRouteText({ distanceM: 20, durationS: 0 }, locale), `20m · ~1 ${t(locale, 'shared.walk')}`);
}

const expected: Record<Locale, { accessibilityLabel: string; accessibilityLanguage: string }> = {
  en: { accessibilityLabel: 'English', accessibilityLanguage: 'en' },
  zh: { accessibilityLabel: '中文', accessibilityLanguage: 'zh-Hans' },
  ms: { accessibilityLabel: 'Melayu', accessibilityLanguage: 'ms' },
  ta: { accessibilityLabel: 'தமிழ்', accessibilityLanguage: 'ta' },
};
for (const option of LOCALE_OPTIONS) assert.deepEqual(languageOptionAccessibility(option), expected[option.value]);
console.log('PASS accessibility header, destination, walking route and language option text in all four locales');
