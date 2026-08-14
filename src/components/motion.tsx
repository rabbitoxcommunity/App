import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { radii } from '../theme';
import { tap, type ImpactStyle } from '../utils/haptics';
import { useTheme } from "../store/ConfigContext";

/**
 * Shared motion primitives. Everything here uses the built-in `Animated` API
 * with `useNativeDriver` wherever the animated property allows it, so the app
 * carries no extra animation dependency.
 */

/* ------------------------------------------------------------- Press scale */

/**
 * Buttons and cards dip slightly under the finger. `activeScale` is deliberately
 * shallow — the design is calm, not bouncy.
 */
export function PressableScale({
  children,
  activeScale = 0.96,
  style,
  containerStyle,
  disabled,
  haptic,
  ...rest
}: PressableProps & {
  children: React.ReactNode;
  activeScale?: number;
  /**
   * Haptics are opt-in and reserved for the app's main actions — view cart,
   * checkout, place order, back, search, apply, add to cart. Ordinary rows,
   * chips, tiles and cards stay silent, so the feedback keeps its meaning.
   *
   * `true` for the light tap, or an `ImpactStyle` to pick the weight.
   */
  haptic?: ImpactStyle | boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Layout applied to the touchable itself rather than the scaling surface.
   * `style` lands on the inner `Animated.View` so the whole card dips under the
   * finger — which means flex properties there never reach the parent row. Pass
   * `flex` / `alignSelf` and friends here instead.
   */
  containerStyle?: StyleProp<ViewStyle>;
}) {
    const { colors } = useTheme();

  const scale = useRef(new Animated.Value(1)).current;

  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  return (
    <Pressable
      disabled={disabled}
      // Fires with the scale dip, not on release: the tap should land under the
      // finger at the moment the button visibly reacts.
      onPressIn={() => {
        if (disabled) return;
        if (haptic) tap(haptic === true ? undefined : haptic);
        to(activeScale);
      }}
      onPressOut={() => to(1)}
      style={containerStyle}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* -------------------------------------------------------- Entrance stagger */

/**
 * Fades a row up into place. `index` staggers a list so items arrive in
 * sequence rather than all at once.
 */
export function FadeSlideIn({
  children,
  index = 0,
  distance = 14,
  delayStep = 45,
  duration = 260,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  distance?: number;
  delayStep?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
    const { colors } = useTheme();

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      // Cap the stagger so a long list does not take seconds to appear.
      delay: Math.min(index, 8) * delayStep,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, index, delayStep, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ------------------------------------------------------------- Value bumps */

/**
 * Pops when `value` changes — used for the cart badge and any count that
 * updates in place.
 */
export function Bump({
  value,
  children,
  style,
}: {
  value: number | string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
    const { colors } = useTheme();

  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.28, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
  }, [value, scale]);

  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

/**
 * Counts from the previous number to the new one. Money totals change often
 * enough that a hard swap reads as a glitch.
 */
export function AnimatedNumber({
  value,
  format,
  style,
  duration = 420,
}: {
  value: number;
  format: (value: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}) {
    const { colors } = useTheme();

  const animated = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const id = animated.addListener(({ value: v }) => setDisplay(v));
    return () => animated.removeListener(id);
  }, [animated]);

  useEffect(() => {
    const animation = Animated.timing(animated, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      // Driving JS state, so this one cannot run on the native thread.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [value, animated, duration]);

  return <Text style={style}>{format(display)}</Text>;
}

/* --------------------------------------------------------------- Progress */

/** Fills from 0 to `progress` (0–1) on mount and whenever it changes. */
export function AnimatedBar({
  progress,
  height = 8,
  trackColor,
  fillColor,
  duration = 900,
  style,
}: {
  progress: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
    const { colors } = useTheme();

  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(animated, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, animated, duration]);

  const width = animated.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        {
          height,
          borderRadius: radii.pill,
          backgroundColor: trackColor ?? 'rgba(255,255,255,0.3)',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{ width, height: '100%', borderRadius: radii.pill, backgroundColor: fillColor }}
      />
    </View>
  );
}

/** Draws a vertical timeline connector downward. */
export function AnimatedConnector({
  active,
  color,
  minHeight = 34,
  delay = 0,
}: {
  active: boolean;
  color: string;
  minHeight?: number;
  delay?: number;
}) {
    const { colors } = useTheme();

  // Always starts empty; only a completed step draws its connector in.
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      progress.setValue(0);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [active, progress, delay]);

  return (
    <View style={{ width: 2, flex: 1, minHeight, backgroundColor: colors.borderLighter }}>
      <Animated.View
        style={{
          width: 2,
          height: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ Pulse */

/** Soft breathing halo, used on the live step of the order timeline. */
export function Pulse({
  children,
  color,
  size,
  active = true,
}: {
  children: React.ReactNode;
  color?: string;
  size: number;
  active?: boolean;
}) {
    const { colors } = useTheme();

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, progress]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {active && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) },
            ],
          }}
        />
      )}
      {children}
    </View>
  );
}

/* -------------------------------------------------------------- Skeletons */

/** Shimmering placeholder block for loading states. */
export function Skeleton({
  width,
  height,
  radius = radii.md,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
    const { colors } = useTheme();

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.surfaceMuted,
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
        },
        style,
      ]}
    />
  );
}

/* --------------------------------------------------------------- Utilities */

/** Cross-fades between children whenever `sentinel` changes. */
export function CrossFade({
  sentinel,
  children,
  style,
}: {
  sentinel: string | number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
    const { colors } = useTheme();

  const opacity = useRef(new Animated.Value(1)).current;
  const previous = useRef(sentinel);

  useEffect(() => {
    if (previous.current === sentinel) return;
    previous.current = sentinel;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [sentinel, opacity]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

/** Shared spring config so every sheet and toast settles identically. */
export const SHEET_SPRING = {
  damping: 22,
  stiffness: 220,
  mass: 0.9,
  useNativeDriver: true,
} as const;
