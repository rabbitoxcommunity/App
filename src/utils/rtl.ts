import { DevSettings, I18nManager, Platform } from 'react-native';

/**
 * Applying a writing-direction change is platform-specific:
 *
 * - **Native**: `I18nManager.forceRTL` is written to native storage and only
 *   takes effect on the next JS bundle load, so the app must restart.
 * - **Web**: react-native-web reads `I18nManager.isRTL` while rendering and does
 *   *not* persist the flag across page loads. Setting it before the first render
 *   is enough, and a reload would reset it — so bootstrap must never restart on
 *   web, or the app would loop forever.
 */
export const directionNeedsRestart = Platform.OS !== 'web';

export function applyDirection(isRTL: boolean): void {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(isRTL);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    // Keeps CSS logical properties (start/end) resolving the right way.
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  }
}

/** Restarts the app so a direction change takes hold. */
export async function reloadApp(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.location.reload();
    return;
  }

  try {
    const Updates = require('expo-updates');
    await Updates.reloadAsync();
    return;
  } catch {
    // expo-updates unavailable or not configured (e.g. plain Expo Go).
  }

  if (__DEV__ && typeof DevSettings?.reload === 'function') DevSettings.reload();
}
