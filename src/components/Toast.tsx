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

import { fontSize, radii, spacing, weight } from '../theme';
import { Icon, type IconName } from './Icon';
import { useTheme } from "../store/ConfigContext";

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

/** Height of the bottom tab bar the toast floats above (design: 86px). */
const TAB_BAR_HEIGHT = 62;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

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

    /**
     * Severity is the ONLY thing tone changes now: the capsule fill is the same
     * frosted dark in every case, so each tone just picks an icon colour that
     * stays legible on it. The previous per-tone card palette (soft tinted
     * backgrounds, matching borders, per-tone title/body inks) is gone with the
     * card itself.
     */
    const ACCENT: Record<ToastTone, string> = React.useMemo(() => ({
      dark: colors.onPrimary,
      loading: colors.onPrimary,
      success: colors.primaryOnDark,
      warning: colors.warningBright,
      danger: colors.dangerBright,
    }), [colors]);

  const accent = ACCENT[toast?.tone ?? 'dark'] ?? colors.onPrimary;
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
          {/* A capsule that hugs its content rather than a full-width card, so
              a short confirmation reads as a small pill and only a long one
              approaches the screen edges. The frosted fill is neutral in every
              tone — severity is carried by the icon colour alone. */}
          <BlurView
            intensity={60}
            tint="systemThickMaterialDark"
            accessibilityLiveRegion="polite"
            style={[styles.capsule, theme.shadow.toast]}
          >
            {toast.tone === 'loading' ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Icon name={toast.icon ?? 'check'} size={18} color={accent} />
            )}

            <View style={styles.text}>
              <Text style={styles.title} numberOfLines={1}>
                {toast.title}
              </Text>
              {/* Kept, though the capsule is single-line by default: ~a third of
                  call sites pass a body (the product just added, the failing
                  field), and dropping it would lose that detail entirely. */}
              {!!toast.body && (
                <Text style={styles.body} numberOfLines={1}>
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
                style={styles.actionButton}
              >
                <Text style={styles.action}>{toast.action.label}</Text>
              </Pressable>
            )}
          </BlurView>
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

const makeStyles = (colors: any) => StyleSheet.create({
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
  // Spans the screen and centres the capsule, rather than insetting it to the
  // gutters — the capsule sizes itself to its text and sits in the middle.
  wrapper: {
    position: 'absolute',
    start: 0,
    end: 0,
    alignItems: 'center',
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    // Clips the blur to the pill on Android, where it would otherwise paint
    // past the rounded corners.
    overflow: 'hidden',
    // Behind the blur: on Android expo-blur can fall back to nearly nothing,
    // and white text on an untinted background would be unreadable.
    backgroundColor: 'rgba(18, 22, 19, 0.82)',
    // Long messages stop short of the edges instead of running the full width.
    maxWidth: '92%',
  },
  // `shrink`, not `flex: 1` — the text block must not stretch the capsule to
  // fill the row, or every toast would be full-width again.
  text: { flexShrink: 1 },
  title: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.onPrimary },
  body: { fontSize: fontSize.caption, fontWeight: weight.semibold, color: colors.onPrimaryMuted, marginTop: 1 },
  actionButton: {
    paddingStart: spacing.sm,
    marginStart: 2,
    borderStartWidth: StyleSheet.hairlineWidth,
    borderStartColor: 'rgba(255,255,255,0.25)',
  },
  action: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primaryOnDark },
});
