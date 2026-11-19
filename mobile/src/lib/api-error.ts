import { getFriendlyApiError, getFriendlyError, t, type Locale, type TranslationKey } from '@binwhere/core';
import { ApiError } from '../api/client';

export function rateLimitMessage(seconds: number | null): { key: TranslationKey; n?: number } {
  if (seconds === null || seconds === 0) return { key: 'error.rateLimited' };
  if (seconds < 60) return { key: 'error.rateLimitedSeconds', n: seconds };
  if (seconds < 3600) return { key: 'error.rateLimitedMinutes', n: Math.ceil(seconds / 60) };
  return { key: 'error.rateLimitedHours', n: Math.ceil(seconds / 3600) };
}

export function getMobileError(error: unknown, locale: Locale): string {
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') {
      const message = rateLimitMessage(error.retryAfterSeconds);
      return t(locale, message.key).replace('{n}', String(message.n));
    }
    return getFriendlyApiError(error.code, locale);
  }
  return getFriendlyError(error instanceof Error ? error.message : String(error), locale);
}
