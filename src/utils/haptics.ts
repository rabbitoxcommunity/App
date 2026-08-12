import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback for taps.
 *
 * Every call is fire-and-forget and swallows its own errors: feedback is a
 * nicety, and a device with the Taptic Engine switched off (or in Low Power
 * Mode, where iOS ignores haptics outright) must never break a press handler.
 *
 * Web is skipped deliberately. `expo-haptics` maps to the Web Vibration API,
 * which desktop browsers ignore and some mobile browsers warn about — there is
 * nothing useful to deliver there.
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export const ImpactStyle = Haptics.ImpactFeedbackStyle;
/** Same name in type position, so callers can annotate props with it. */
export type ImpactStyle = Haptics.ImpactFeedbackStyle;

/** The default tap: light, for ordinary buttons, rows, chips and links. */
export function tap(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (!supported) return;
  Haptics.impactAsync(style).catch(() => undefined);
}

/** Weightier tap for primary CTAs — Place order, Add to cart, Checkout. */
export function tapMedium() {
  tap(Haptics.ImpactFeedbackStyle.Medium);
}

/** For moving between options in a set: tabs, segmented controls, steppers. */
export function selection() {
  if (!supported) return;
  Haptics.selectionAsync().catch(() => undefined);
}

/** Outcome feedback, for when an action resolves rather than when it starts. */
export function notify(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success,
) {
  if (!supported) return;
  Haptics.notificationAsync(type).catch(() => undefined);
}

export const NotificationType = Haptics.NotificationFeedbackType;

/**
 * Wraps a press handler so it fires a tap first. Keeps call sites to a one-line
 * change: `onPress={withTap(doThing)}`.
 */
export function withTap<A extends unknown[]>(
  handler?: (...args: A) => void,
  style?: Haptics.ImpactFeedbackStyle,
) {
  return (...args: A) => {
    tap(style);
    handler?.(...args);
  };
}
