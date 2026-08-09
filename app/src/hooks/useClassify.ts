'use client';

import { useState, useCallback } from 'react';
import type { ClassifyResult } from '@/lib/ai/types';
import type { Locale } from '@/lib/i18n/types';
import { ApiError, classifyItem, isRetryable } from '@/lib/api-client';
import { getFriendlyApiError, getFriendlyError } from '@/lib/constants';

interface UseClassifyReturn {
  result: ClassifyResult | null;
  loading: boolean;
  error: string | null;
  classify: (params: { image?: string; text?: string; locale?: Locale }) => Promise<ClassifyResult | null>;
  reset: () => void;
}

const MAX_RETRIES = 1;
const RETRY_DELAY = 1500;

export function useClassify(): UseClassifyReturn {
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classify = useCallback(async (params: { image?: string; text?: string; locale?: Locale }): Promise<ClassifyResult | null> => {
    setLoading(true);
    setError(null);
    setResult(null);

    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await classifyItem(params);
        setResult(data);
        setLoading(false);
        return data;
      } catch (err) {
        lastError = err;
        // Only retry on 5xx / network errors, not on successful "not_sure" responses
        if (attempt < MAX_RETRIES && isRetryable(err)) {
          await new Promise(r => setTimeout(r, RETRY_DELAY));
          continue;
        }
        break;
      }
    }

    const locale = params.locale ?? 'en';
    if (lastError instanceof ApiError) {
      setError(getFriendlyApiError(lastError.code, locale));
    } else {
      const raw = lastError instanceof Error ? lastError.message : 'Something went wrong';
      setError(getFriendlyError(raw, locale));
    }
    setLoading(false);
    return null;
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { result, loading, error, classify, reset };
}
