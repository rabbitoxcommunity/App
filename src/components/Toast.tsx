import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSize, radii, shadow, spacing, weight } from '../theme';
import { Icon, type IconName } from './Icon';

export type ToastTone = 'dark' | 'warning' | 'danger' | 'success' | 'loading';

export type ToastOptions = {
  title: string;
  body?: string;
  tone?: ToastTone;
  icon?: IconName;
  /** Trailing text button, e.g. "View" / "Undo" / "Retry". */
  action?: { label: string; onPress: () => void };
  /** ms; `loading` toasts stay until dismissed unless a duration is given. */
  duration?: number;
  /**
   * `banner` (default) drops in from the top. `hud` is the centred, blurred
   * panel iOS uses for work in progress — it dims and blocks the screen, which
   * is what you want while an order is being placed and a second tap must not
   * land.
   */
  variant?: 'banner' | 'hud';
};

type ToastContextValue = {
  show: (options: ToastOptions) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONES: Record<
  ToastTone,
  { bg: string; border?: string; title: string; body: string; action: string; icon: string }
> = {
  dark: {
    bg: colors.ink,
    title: colors.onPrimary,
    body: 'rgba(255,255,255,0.65)',
    action: colors.primaryOnDark,
    icon: colors.onPrimary,
  },
  loading: {
    bg: colors.ink,
    title: colors.onPrimary,
    body: 'rgba(255,255,255,0.65)',
    action: colors.primaryOnDark,
    icon: colors.onPrimary,
  },
  warning: {
    bg: colors.warningSoft,
    border: colors.warningSoftBorder,
    title: colors.warningInk,
    body: colors.warningInkSoft,
    action: colors.warning,
    icon: colors.warning,
  },
  danger: {
    bg: colors.dangerSoft,
    border: colors.dangerSoftBorder,
    title: colors.dangerInk,
    body: colors.dangerInkSoft,
    action: colors.danger,
    icon: colors.danger,
  },
  success: {
    bg: colors.primarySoft,
    border: colors.primarySoftBorder,
    title: colors.primaryDarker,
    body: '#4A8C2C',
    action: colors.primaryDark,
    icon: colors.primaryDark,
  },
};

/** Height of the bottom tab bar the toast floats above (design: 86px). */
const TAB_BAR_HEIGHT = 62;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const hudOpacity = useRef(new Animated.Value(0)).current;
  const hudScale = useRef(new Animated.Value(0.9)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const hide = useCallback(() => {
    clearTimer();
    Animated.parallel([
      Animated.timing(translateY, { toValue: -140, duration: 180, useNativeDriver: true }),
      // The HUD fades and shrinks slightly, the way iOS dismisses one.
      Animated.timing(hudOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(hudScale, { toValue: 0.94, duration: 160, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [translateY, hudOpacity, hudScale]);

  const show = useCallback(
    (options: ToastOptions) => {
      clearTimer();
      setToast(options);

      if (options.variant === 'hud') {
        hudOpacity.setValue(0);
        hudScale.setValue(0.9);
        Animated.parallel([
          Animated.timing(hudOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
          Animated.spring(hudScale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 16,
            stiffness: 220,
          }),
        ]).start();
      } else {
        translateY.setValue(-120);
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
        }).start();
      }

      const duration = options.duration ?? (options.tone === 'loading' ? 0 : 3000);
      if (duration > 0) timer.current = setTimeout(hide, duration);
    },
    [hide, translateY, hudOpacity, hudScale],
  );

  useEffect(() => clearTimer, []);

  // Swipe up to dismiss
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy < -6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        if (g.dy < 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -40) {
          hide();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const value = useMemo<ToastContextValue>(() => ({ show, hide }), [show, hide]);

  const tone = TONES[toast?.tone ?? 'dark'];
  const isHud = toast?.variant === 'hud';

  return (
    <ToastContext.Provider value={value}>
      {children}

      {toast && isHud && (
        <Animated.View
          // `auto`, not `box-none`: the scrim swallows taps for as long as the
          // HUD is up, so the action behind it cannot be fired twice.
          pointerEvents="auto"
          style={[styles.hudScrim, { opacity: hudOpacity }]}
        >
          <Animated.View style={{ transform: [{ scale: hudScale }] }}>
            <BlurView
              intensity={60}
              tint="systemThickMaterialDark"
              style={styles.hud}
              accessibilityLiveRegion="polite"
            >
              {toast.tone === 'loading' ? (
                <ActivityIndicator size="large" color={colors.onPrimary} />
              ) : (
                <View style={styles.hudCheck}>
                  <Icon name={toast.icon ?? 'check'} size={34} color={colors.onPrimary} />
                </View>
              )}
              <Text style={styles.hudTitle} numberOfLines={2}>
                {toast.title}
              </Text>
            </BlurView>
          </Animated.View>
        </Animated.View>
      )}

      {toast && !isHud && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrapper,
            { top: insets.top + 12, transform: [{ translateY }] },
          ]}
          {...pan.panHandlers}
        >
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              { backgroundColor: tone.bg },
              tone.border ? { borderWidth: 1.5, borderColor: tone.border } : null,
              toast.tone === 'dark' || toast.tone === 'loading' || !toast.tone
                ? shadow.toast
                : null,
            ]}
          >
            {toast.tone === 'loading' ? (
              <ActivityIndicator color={colors.primaryOnDark} />
            ) : toast.icon ? (
              <Icon name={toast.icon} size={24} color={tone.icon} />
            ) : (
              <View style={styles.checkBubble}>
                <Icon name="check" size={19} color={colors.onPrimary} />
              </View>
            )}

            <View style={styles.text}>
              <Text style={[styles.title, { color: tone.title }]} numberOfLines={2}>
                {toast.title}
              </Text>
              {!!toast.body && (
                <Text style={[styles.body, { color: tone.body }]} numberOfLines={2}>
                  {toast.body}
                </Text>
              )}
            </View>

            {toast.action && (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  hide();
                  toast.action?.onPress();
                }}
              >
                <Text style={[styles.action, { color: tone.action }]}>{toast.action.label}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  hudScrim: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 24, 28, 0.22)',
  },
  hud: {
    // iOS sizes its progress HUD as a soft square, not a wide bar.
    width: 168,
    minHeight: 168,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    // `overflow: hidden` is what clips the blur to the rounded corners.
    overflow: 'hidden',
  },
  hudCheck: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudTitle: {
    fontSize: fontSize.bodyLg,
    fontWeight: weight.bold,
    color: colors.onPrimary,
    textAlign: 'center',
  },
  wrapper: {
    position: 'absolute',
    start: spacing.lg,
    end: spacing.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii['2xl'],
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  checkBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: fontSize.body, fontWeight: weight.heavy },
  body: { fontSize: fontSize.caption, fontWeight: weight.semibold, marginTop: 2 },
  action: { fontSize: fontSize.small, fontWeight: weight.heavy },
});
