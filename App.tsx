import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SYMBOL_FONTS } from './src/components/Icon';
import { ToastProvider } from './src/components/Toast';
import { initI18n, isRTLLanguage, type Language } from './src/i18n';
import { LocaleProvider } from './src/i18n/LocaleProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SplashScreen } from './src/screens/SplashScreen';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { CartProvider } from './src/store/CartContext';
import { OrdersProvider } from './src/store/OrdersContext';
import { applyDirection, directionNeedsRestart, reloadApp } from './src/utils/rtl';

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
  const [fontsLoaded] = useFonts({
    [SYMBOL_FONTS.outlined]: require('./assets/fonts/MaterialSymbolsRounded-Fill0.ttf'),
    [SYMBOL_FONTS.filled]: require('./assets/fonts/MaterialSymbolsRounded-Fill1.ttf'),
  });

  if (!language || !fontsLoaded) {
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
            <OrdersProvider>
              <ToastProvider>
                <Gate />
              </ToastProvider>
            </OrdersProvider>
          </CartProvider>
        </AuthProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
