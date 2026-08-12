import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../theme';

/**
 * Loading placeholders.
 *
 * A pulse rather than a sweeping shimmer: the opacity loop drives on the native
 * driver, so it costs nothing on the JS thread while a screen is busy, whereas a
 * gradient sweep would need an extra dependency the app deliberately avoids.
 */
const PULSE_MS = 850;

function usePulse() {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value]);

  // Never fully opaque and never fully faded — the block should read as
  // "content pending", not as something blinking on and off.
  return value.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
}

/** A single placeholder block. `width` accepts a number or a percentage. */
export function Skeleton({
  width,
  height = 12,
  radius = radii.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = usePulse();
  return (
    <Animated.View
      // Placeholders are decorative: a screen reader should announce the real
      // content when it lands, not a run of empty blocks.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        { height, borderRadius: radius },
        width !== undefined && { width },
        style,
        { opacity },
      ]}
    />
  );
}

/** Stand-in for the product cards on the Home rail. */
export function ProductCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={112} radius={radii.xl} />
      <Skeleton width="80%" height={13} style={styles.gapTop} />
      <Skeleton width="55%" height={11} style={styles.gapSm} />
      <View style={styles.cardFooter}>
        <Skeleton width={54} height={15} />
        <Skeleton width={34} height={34} radius={radii.md} />
      </View>
    </View>
  );
}

/** Stand-in for the full-width rows in the category listing and search. */
export function ProductRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={66} height={66} radius={radii.lg} />
      <View style={styles.rowBody}>
        <Skeleton width="70%" height={13} />
        <Skeleton width="45%" height={11} style={styles.gapSm} />
        <Skeleton width={62} height={16} radius={radii.pill} style={styles.gapSm} />
      </View>
      <View style={styles.rowTrailing}>
        <Skeleton width={52} height={14} />
        <Skeleton width={38} height={38} radius={radii.md} />
      </View>
    </View>
  );
}

/** Stand-in for an order history card. */
export function OrderCardSkeleton() {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Skeleton width={92} height={14} />
        <Skeleton width={76} height={22} radius={radii.pill} />
      </View>
      <Skeleton width="65%" height={11} style={styles.gapTop} />
      <View style={styles.thumbs}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={52} height={52} radius={13} />
        ))}
      </View>
      <View style={styles.orderActions}>
        <Skeleton width="100%" height={46} radius={radii.xl} style={styles.flex} />
        <Skeleton width={96} height={46} radius={radii.xl} />
      </View>
    </View>
  );
}

/** Repeats any of the above `count` times, with the list's own spacing. */
export function SkeletonList({
  count = 4,
  gap = spacing.md,
  children,
}: {
  count?: number;
  gap?: number;
  children: () => React.ReactNode;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>{children()}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.borderLight, overflow: 'hidden' },
  flex: { flex: 1 },
  gapTop: { marginTop: 10 },
  gapSm: { marginTop: 6 },

  card: { width: 150 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radii['2xl'],
    padding: spacing.sm,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTrailing: { alignItems: 'flex-end', gap: 7 },

  orderCard: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radii['4xl'],
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  orderActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
