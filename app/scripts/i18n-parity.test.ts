import assert from 'node:assert/strict';

import en from '../../packages/core/src/i18n/locales/en';
import zh from '../../packages/core/src/i18n/locales/zh';
import ms from '../../packages/core/src/i18n/locales/ms';
import ta from '../../packages/core/src/i18n/locales/ta';

const locales = { en, zh, ms, ta } as const;
const referenceKeys = Object.keys(en).sort();

for (const [locale, messages] of Object.entries(locales)) {
  assert.deepEqual(
    Object.keys(messages).sort(),
    referenceKeys,
    `${locale} translation keys differ from English`,
  );
}

console.log(`PASS i18n key parity (${referenceKeys.length} keys × 4 locales)`);
