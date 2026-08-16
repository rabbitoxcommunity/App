import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
  title: string;
  body?: string;
  cancelLabel: string;
  confirmLabel: string;
  destructive?: boolean;
};

/**
 * `Alert.alert`'s multi-button form is a no-op on web — react-native-web
 * doesn't implement it at all (not even a `window.confirm` fallback), so
 * every "are you sure?" dialog silently did nothing there. Native platforms
 * still get the real Alert; web gets `window.confirm`.
 */
export function confirmAlert(options: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const message = options.body ? `${options.title}\n\n${options.body}` : options.title;
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    Alert.alert(options.title, options.body, [
      { text: options.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: options.confirmLabel, style: options.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

/** Single-button informational alert — same web gap as above. */
export function infoAlert(title: string, body?: string): void {
  if (Platform.OS === 'web') {
    window.alert(body ? `${title}\n\n${body}` : title);
    return;
  }
  Alert.alert(title, body);
}
