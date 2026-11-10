import type { TranslationKey } from './i18n';
import type { EwasteAccept } from './types/api-v2';

const ACCEPT_KEYS = {
  ict: 'accept.ict',
  battery: 'accept.batteries',
  lamp: 'accept.lamps',
  non_regulated: 'accept.appliances',
  all_regulated: 'accept.allEwaste',
} as const satisfies Record<EwasteAccept, TranslationKey>;

export function ewasteAcceptTranslationKey(kind: EwasteAccept): TranslationKey {
  return ACCEPT_KEYS[kind];
}
