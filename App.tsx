import { useFonts } from 'expo-font';
import * as NativeSplash from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SYMBOL_FONTS } from './src/components/Icon';
import { ToastProvider } from './src/components/Toast';
import { initI18n, isRTLLanguage, type Language } from './src/i18n';
import { LocaleProvider } from './src/i18n/LocaleProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SplashScreen } from './src/screens/SplashScreen';
import { AddressesProvider } from './src/store/AddressesContext';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { CartProvider } from './src/store/CartContext';
import { OrdersProvider } from './src/store/OrdersContext';
import { SearchHistoryProvider } from './src/store/SearchHistoryContext';
import { applyDirection, directionNeedsRestart, reloadApp } from './src/utils/rtl';

/**
 * The native splash is configured (app.json) as the brand green field with the
 * same logo tile `SplashScreen` draws, so holding it until our own splash has
 * painted reads as one continuous screen rather than two. Called in global
 * scope, deliberately un-awaited, per the expo-splash-screen docs.
 */
NativeSplash.preventAutoHideAsync().catch(() => undefined);
NativeSplash.setOptions({ duration: 250, fade: true });

/** Floor on how long our own splash stays up, so it is seen rather than flashed. */
const MIN_SPLASH_MS = 1600;

/**
 * Reconciles the stored language with the layout direction *before* the UI
 * mounts. On native the flag only applies after a restart, so the launch that
 * follows a language change flips it and reloads once; on web setting it before
 * the first render is enough (and reloading would loop — see `utils/rtl`).
 */
function useBootstrap() {
  const [language, setLanguage] = useState<Language | null>(null);

  useEffect(() => {
    (async () => {
      const resolved = await initI18n();
      const shouldBeRTL = isRTLLanguage(resolved);

      if (shouldBeRTL !== I18nManager.isRTL) {
        applyDirection(shouldBeRTL);
        if (directionNeedsRestart) {
          await reloadApp();
          // If no reload mechanism is available the flag applies on the next
          // manual restart; rendering continues so we never stall on splash.
        }
      }

      setLanguage(resolved);
    })();
  }, []);

  return language;
}

/** Keeps the splash on screen until the persisted session has been read. */
function Gate() {
  const { isRestoring } = useAuth();
  if (isRestoring) return <SplashScreen />;
  return <RootNavigator />;
}

export default function App() {
  const language = useBootstrap();
  // Both fills of the design's icon font. Icons render as tofu until these are
  // registered, so the splash stays up until they resolve.
  const [fontsLoaded, fontError] = useFonts({
    [SYMBOL_FONTS.outlined]: require('./assets/fonts/MaterialSymbolsRounded-Fill0.ttf'),
    [SYMBOL_FONTS.filled]: require('./assets/fonts/MaterialSymbolsRounded-Fill1.ttf'),
  });
  // A font that fails to load must not strand the app on the splash forever —
  // icons degrade, everything else still works.
  const fontsSettled = fontsLoaded || !!fontError;

  const handOver = useCallback(() => {
    NativeSplash.hideAsync().catch(() => undefined);
  }, []);

  /**
   * Hand over as soon as the icon font is registered, not on first paint:
   * `Icon` holds glyphs transparent until then, so an earlier handover would
   * swap the native splash's logo for an empty tile and flicker.
   */
  useEffect(() => {
    if (fontsSettled) handOver();
  }, [fontsSettled, handOver]);

  // Bootstrap usually resolves in a few frames, which would make the splash a
  // subliminal flash. Hold it long enough for the design's progress bar to read.
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  const ready = !!language && fontsSettled && minElapsed;

  if (!ready) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <LocaleProvider initialLanguage={language}>
        <AuthProvider>
          <CartProvider>
            <AddressesProvider>
              <OrdersProvider>
                <SearchHistoryProvider>
                  <ToastProvider>
                    <Gate />
                  </ToastProvider>
                </SearchHistoryProvider>
              </OrdersProvider>
            </AddressesProvider>
          </CartProvider>
        </AuthProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
