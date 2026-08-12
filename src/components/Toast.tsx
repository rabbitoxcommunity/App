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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const hide = useCallback(() => {
    clearTimer();
    Animated.timing(translateY, {
      toValue: -140,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [translateY]);

  const show = useCallback(
    (options: ToastOptions) => {
      clearTimer();
      setToast(options);
      translateY.setValue(-120);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }).start();

      const duration = options.duration ?? (options.tone === 'loading' ? 0 : 3000);
      if (duration > 0) timer.current = setTimeout(hide, duration);
    },
    [hide, translateY],
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

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
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
