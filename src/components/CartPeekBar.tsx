import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLang } from '../hooks/useLang';
import { useCart } from '../store/CartContext';
import { useConfig, useTheme } from '../store/ConfigContext';
import { fontSize, radii, spacing, weight } from '../theme';
import { formatAmount } from '../utils/format';
import { Icon } from './Icon';
import { ImpactStyle, withTap } from '../utils/haptics';

/**
 * Floating "N items · AED X — View cart" bar that sits above the tab bar while
 * browsing. Renders nothing when the cart is empty.
 */
export function CartPeekBar({ onPress, bottom }: { onPress: () => void; bottom: number }) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const { t } = useLang();
  const { totals } = useCart();
  const { config } = useConfig();
  const deliveryEtaMinutes = config?.settings.deliveryEtaMinutes ?? 30;

  if (totals.itemCount === 0) return null;

  return (
    <View style={[styles.wrapper, { bottom }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        onPress={withTap(onPress, ImpactStyle.Medium)}
        style={({ pressed }) => [styles.bar, theme.shadow.floatingBar, pressed && styles.pressed]}
      >
        <Icon name="basket" size={24} color={colors.onPrimary} />
        <View style={styles.text}>
          <Text style={styles.summary} numberOfLines={1}>
            {t('listing.cartSummary', {
              count: totals.itemCount,
              total: formatAmount(totals.subtotal),
            })}
          </Text>
          <Text style={styles.eta} numberOfLines={1}>
            {t('listing.deliveryEta', { minutes: deliveryEtaMinutes })}
          </Text>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaLabel}>{t('listing.viewCart')}</Text>
          <Icon name="forward" size={18} color={colors.primaryDark} />
        </View>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  wrapper: { position: 'absolute', start: spacing.gutter, end: spacing.gutter },
  bar: {
    height: 60,
    borderRadius: radii['3xl'],
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingStart: 18,
    paddingEnd: 10,
  },
  pressed: { opacity: 0.9 },
  text: { flex: 1, minWidth: 0 },
  summary: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.onPrimary },
  eta: {
    fontSize: fontSize.tiny,
    fontWeight: weight.semibold,
    color: colors.onPrimary,
    opacity: 0.85,
  },
  cta: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ctaLabel: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.primaryDark },
});
