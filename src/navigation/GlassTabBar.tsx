import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, I18nManager, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../components/Icon';
import { Bump } from '../components/motion';
import { useCart } from '../store/CartContext';
import { colors, fontSize, radii, weight } from '../theme';
import type { TabParamList } from './types';

/** Glyph per tab. The active cut is the filled variant of the same symbol. */
const ICONS: Record<keyof TabParamList, IconName> = {
  Home: 'home',
  Categories: 'categories',
  Cart: 'cart',
  Orders: 'orders',
  Account: 'account',
};

const BAR_HEIGHT = 66;
const SIDE_MARGIN = 16;
/** Gutter above the capsule, part of the space a screen must leave clear. */
const TOP_GAP = 8;
/** Inset of the selection capsule inside the bar. */
const PILL_INSET = 6;

/**
 * Total space the bar occupies. It floats *over* the scene — that is the whole
 * point of the material, since a bar in normal flow would only ever blur the
 * background colour — so tab screens pad their scroll content by this much to
 * keep the last row reachable.
 */
export function useGlassTabBarHeight() {
  const insets = useSafeAreaInsets();
  return TOP_GAP + BAR_HEIGHT + Math.max(insets.bottom, 10);
}

/**
 * A Liquid Glass tab bar: a floating translucent capsule that the content
 * scrolls underneath, with a bright specular rim and a selection lozenge that
 * slides between tabs.
 */
export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();
  const [barWidth, setBarWidth] = useState(0);

  const count = state.routes.length;
  const tabWidth = barWidth > 0 ? (barWidth - PILL_INSET * 2) / count : 0;

  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (tabWidth === 0) return;
    // Under RTL the row itself is mirrored, so the capsule counts from the
    // other end rather than the transform being negated.
    const position = I18nManager.isRTL ? count - 1 - state.index : state.index;
    Animated.spring(slide, {
      toValue: position * tabWidth,
      useNativeDriver: true,
      damping: 18,
      stiffness: 210,
      mass: 0.9,
    }).start();
  }, [state.index, tabWidth, count, slide]);

  return (
    <View
      style={[styles.host, { paddingBottom: Math.max(insets.bottom, 10) }]}
      // The bar paints its own surface; the navigator's must stay clear or the
      // glass would be blurring a flat white rectangle instead of the content.
      pointerEvents="box-none"
    >
      <View style={styles.shadow}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 70 : 40}
          tint="systemThinMaterialLight"
          style={styles.bar}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          {/* Tint layer: the blur alone reads grey over busy content, so a wash
              of the app's surface colour keeps the bar feeling like the app. */}
          <View pointerEvents="none" style={styles.wash} />
          {/* Specular rim — brighter along the top edge, the way a curved glass
              surface catches light. */}
          <View pointerEvents="none" style={styles.rim} />
          <View pointerEvents="none" style={styles.sheen} />

          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.capsule,
                { width: tabWidth, transform: [{ translateX: slide }] },
              ]}
            />
          )}

          <View style={styles.row}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const focused = state.index === index;
              const label = options.tabBarAccessibilityLabel ?? route.name;
              const icon = ICONS[route.name as keyof TabParamList];
              const badge = route.name === 'Cart' ? itemCount : 0;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name as never);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={label}
                  onPress={onPress}
                  onLongPress={() =>
                    navigation.emit({ type: 'tabLongPress', target: route.key })
                  }
                  style={styles.tab}
                >
                  <View>
                    {/* No `Bump` here: selection is already carried by the
                        sliding capsule, the filled glyph and the colour
                        change. Scaling the icon on top of that reads as the
                        tab zooming under the finger. */}
                    <Icon
                      name={icon}
                      size={24}
                      filled={focused}
                      color={focused ? colors.primaryDarker : colors.inkMuted}
                    />
                    {badge > 0 && (
                      <Bump value={badge} style={styles.badge}>
                        <Text style={styles.badgeLabel}>{badge > 99 ? '99+' : badge}</Text>
                      </Bump>
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.label,
                      {
                        color: focused ? colors.primaryDarker : colors.inkMuted,
                        fontWeight: focused ? weight.heavy : weight.bold,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    paddingHorizontal: SIDE_MARGIN,
    paddingTop: TOP_GAP,
    backgroundColor: 'transparent',
  },
  /**
   * The shadow lives on a wrapper, not on the blur: `overflow: hidden` is what
   * clips the blur to the capsule, and a view cannot both clip its children and
   * cast a shadow outside itself.
   */
  shadow: {
    borderRadius: radii.pill,
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: radii.pill,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  /** A soft highlight across the top third, fading into the body of the bar. */
  sheen: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: BAR_HEIGHT * 0.42,
    borderTopLeftRadius: radii.pill,
    borderTopRightRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
  },
  capsule: {
    position: 'absolute',
    top: PILL_INSET,
    start: PILL_INSET,
    bottom: PILL_INSET,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  row: { flexDirection: 'row', paddingHorizontal: PILL_INSET },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: {
    fontSize: fontSize.micro,
    // The glyph's Text box is a full em tall and the label carries its own
    // line box, so both sit on padding the `gap` cannot reach. Trimming the
    // label's line height closes the rest of the space.
    lineHeight: 12,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  badge: {
    position: 'absolute',
    top: -4,
    end: -8,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: { fontSize: 10, fontWeight: weight.heavy, color: colors.onPrimary },
});
