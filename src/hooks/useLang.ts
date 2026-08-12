import { useTranslation } from 'react-i18next';

import type { Language } from '../i18n';

/**
 * `t` for UI copy plus the resolved language, which product data needs in order
 * to pick between its `name.en` / `name.ar` fields.
 */
export function useLang() {
  const { t, i18n } = useTranslation();
  const language = (i18n.language?.split('-')[0] ?? 'en') as Language;
  return { t, language };
}
