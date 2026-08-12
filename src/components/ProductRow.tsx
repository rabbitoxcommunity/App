import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  displayPrice,
  hasVariants,
  isPurchasable,
  productStock,
  t as tr,
} from '../data/catalog';
import type { Product } from '../data/types';
import { useLang } from '../hooks/useLang';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { formatMoney, formatMoneyFrom } from '../utils/format';
import { Icon } from './Icon';
import { ProductImage } from './ProductImage';
import { StockBadge } from './StockBadge';
import { ImpactStyle, withTap } from '../utils/haptics';

/**
 * Full-width list row used by the category listing. Out-of-stock rows are
 * greyed out and swap the + button for a disabled "Notify me".
 */
export function ProductRow({
  product,
  onPress,
  onAdd,
  onNotify,
}: {
  product: Product;
  onPress: () => void;
  onAdd: () => void;
  onNotify?: () => void;
}) {
  const { t, language } = useLang();
  const stock = productStock(product);
  const soldOut = !isPurchasable(stock);
  const { min, ranged } = displayPrice(product);

  // For a single-SKU product the low-stock hint carries a count; for a parent
  // product with variants the count is per-SKU, so we only show the status.
  const lowStockCount = hasVariants(product)
    ? undefined
    : product.variants[0]?.lowStockCount;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr(product.name, language)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        soldOut && styles.rowSoldOut,
        pressed && styles.pressed,
      ]}
    >
      <ProductImage
        uri={product.imageUrl}
        icon={product.icon}
        size={66}
        radius={radii.lg}
        dimmed={soldOut}
      />

      <View style={styles.body}>
        <Text style={[styles.name, soldOut && styles.nameSoldOut]} numberOfLines={1}>
          {tr(product.name, language)}
        </Text>
        <Text style={[styles.subtitle, soldOut && styles.subtitleSoldOut]} numberOfLines={1}>
          {tr(product.subtitle, language)}
        </Text>
        <View style={styles.badgeRow}>
          <StockBadge status={stock} lowStockCount={lowStockCount} />
        </View>
      </View>

      <View style={styles.trailing}>
        <Text style={[styles.price, soldOut && styles.priceSoldOut]} numberOfLines={1}>
          {ranged ? formatMoneyFrom(min, language) : formatMoney(min, language)}
        </Text>

        {soldOut ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('stock.notifyMe')}
            onPress={onNotify}
            style={styles.notifyButton}
          >
            <Text style={styles.notifyLabel}>{t('stock.notifyMe')}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('product.addToCart')}
            onPress={withTap(onAdd, ImpactStyle.Medium)}
            hitSlop={6}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Icon name="add" size={22} color={colors.onPrimary} />
            {hasVariants(product) && (
              <View style={styles.variantDot}>
                <Icon name="tune" size={10} color={colors.onPrimary} />
              </View>
            )}
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radii['2xl'],
    padding: spacing.sm,
  },
  rowSoldOut: { borderColor: colors.borderLighter, backgroundColor: colors.surfaceDisabled },
  pressed: { opacity: 0.85 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  nameSoldOut: { color: colors.placeholder },
  subtitle: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.placeholder,
    marginTop: 2,
  },
  subtitleSoldOut: { color: colors.disabled },
  badgeRow: { marginTop: 5, flexDirection: 'row' },
  trailing: { alignItems: 'flex-end', gap: 7 },
  price: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.ink },
  priceSoldOut: { color: colors.disabled },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantDot: {
    position: 'absolute',
    bottom: -3,
    end: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyButton: {
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.chipDisabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyLabel: {
    fontSize: fontSize.tiny,
    fontWeight: weight.heavy,
    color: colors.textSecondary,
  },
});
