import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import ar from './locales/ar.json';
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: Language[] = ['ar'];
export const LANGUAGE_STORAGE_KEY = '@freshcart/language';

export const isRTLLanguage = (lang: string): boolean =>
  RTL_LANGUAGES.includes(lang as Language);

const resources = {
  en: { translation: en },
  ar: { translation: ar },
} as const;

/** Device language if we support it, otherwise English. */
function deviceLanguage(): Language {
  const tag = Localization.getLocales()[0]?.languageCode ?? 'en';
  return SUPPORTED_LANGUAGES.includes(tag as Language) ? (tag as Language) : 'en';
}

export async function readStoredLanguage(): Promise<Language | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored && SUPPORTED_LANGUAGES.includes(stored as Language)
      ? (stored as Language)
      : null;
  } catch {
    return null;
  }
}

/**
 * Initialise i18next *before* the first render so no screen ever paints in the
 * wrong language. Returns the resolved language so the caller can reconcile the
 * native RTL flag with it.
 */
export async function initI18n(): Promise<Language> {
  const lng = (await readStoredLanguage()) ?? deviceLanguage();

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'en',
      // React already escapes everything it renders.
      interpolation: { escapeValue: false },
      returnNull: false,
      compatibilityJSON: 'v4',
    });
  } else if (i18n.language !== lng) {
    await i18n.changeLanguage(lng);
  }

  // Arabic must be allowed to mirror; the actual flip is applied by
  // `applyLayoutDirection` which knows whether a reload is required.
  I18nManager.allowRTL(true);

  return lng;
}

export default i18n;
