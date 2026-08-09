import { z } from 'zod';

export const LocaleSchema = z.enum(['en', 'zh', 'ms', 'ta']);

export type Locale = z.infer<typeof LocaleSchema>;
