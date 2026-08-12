import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../components/Icon';
import { colors, fontSize, radii, weight } from '../theme';

/**
 * Shown while i18n initialises and the persisted session is read. Purely
 * presentational — the app swaps it out as soon as that work resolves.
 */
export function SplashScreen({ message }: { message?: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          // Width cannot be driven natively, so this animation runs on the JS
          // thread — it must be stopped on unmount or it keeps ticking forever.
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0.25,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['12%', '92%'] });

  return (
    <View style={styles.root}>
      {/* Decorative bloom circles from the design. */}
      <View style={[styles.bloom, styles.bloomTop]} />
      <View style={[styles.bloom, styles.bloomBottom]} />

      <View style={styles.center}>
        <View style={styles.logo}>
          <Icon name="leaf" size={64} color={colors.primary} />
        </View>
        <Text style={styles.wordmark}>FreshCart</Text>
        <Text style={styles.tagline}>Your supermarket, delivered</Text>
        <Text style={styles.taglineAr}>سوبرماركتك يوصلك إلى بابك</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width }]} />
        </View>
        <Text style={styles.footerLabel}>{message ?? 'DELIVERING ACROSS THE GCC'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary, overflow: 'hidden' },
  bloom: { position: 'absolute', borderRadius: 999 },
  bloomTop: {
    top: -120,
    right: -90,
    width: 300,
    height: 300,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bloomBottom: {
    bottom: -140,
    left: -110,
    width: 340,
    height: 340,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, paddingHorizontal: 40 },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  wordmark: {
    fontSize: fontSize.hero,
    fontWeight: weight.heavy,
    color: colors.onPrimary,
    letterSpacing: -0.8,
  },
  tagline: {
    fontSize: fontSize.bodyLg,
    fontWeight: weight.semibold,
    color: 'rgba(255,255,255,0.9)',
    marginTop: -12,
  },
  taglineAr: {
    fontSize: fontSize.bodyLg,
    fontWeight: weight.semibold,
    color: 'rgba(255,255,255,0.75)',
    marginTop: -14,
  },
  footer: { alignItems: 'center', gap: 16, paddingBottom: 46, paddingHorizontal: 40 },
  track: {
    width: 140,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.onPrimary },
  footerLabel: {
    fontSize: fontSize.caption,
    fontWeight: weight.bold,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.7,
  },
});
