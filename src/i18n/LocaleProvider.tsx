import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';

import { applyDirection, reloadApp } from '../utils/rtl';
import i18n, { isRTLLanguage, LANGUAGE_STORAGE_KEY, Language } from './index';

type LocaleContextValue = {
  language: Language;
  isRTL: boolean;
  /**
   * Persists the language, swaps i18next, and — when the writing direction
   * actually changes — flips the native layout direction and reloads.
   */
  setLanguage: (next: Language) => Promise<void>;
  /** True while a direction change is waiting on the reload. */
  isSwitching: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [isSwitching, setIsSwitching] = useState(false);
  const { i18n: instance } = useTranslation();

  // Keep local state in sync if anything changes i18next directly.
  useEffect(() => {
    const onChange = (lng: string) => setLanguageState(lng as Language);
    instance.on('languageChanged', onChange);
    return () => {
      instance.off('languageChanged', onChange);
    };
  }, [instance]);

  const setLanguage = useCallback(async (next: Language) => {
    if (next === i18n.language) return;

    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);

    const nextIsRTL = isRTLLanguage(next);
    const directionChanges = nextIsRTL !== I18nManager.isRTL;

    await i18n.changeLanguage(next);

    if (directionChanges) {
      setIsSwitching(true);
      applyDirection(nextIsRTL);
      // Give React one frame to paint the "switching" state before the reload.
      setTimeout(reloadApp, 150);
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      // Read the native flag, not the language: during the frame between
      // `forceRTL` and the reload they disagree, and layout follows the flag.
      isRTL: I18nManager.isRTL,
      setLanguage,
      isSwitching,
    }),
    [language, setLanguage, isSwitching],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}
