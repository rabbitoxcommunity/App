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
import { formatMoney } from '../utils/format';
import { Icon } from './Icon';
import { ProductImage } from './ProductImage';

export const PRODUCT_CARD_WIDTH = 152;

/**
 * The 152px-wide card used in Home's horizontal rails. One card per *parent*
 * product — variant selection happens on the detail screen.
 */
export function ProductCard({
  product,
  onPress,
  onAdd,
}: {
  product: Product;
  onPress: () => void;
  onAdd: () => void;
}) {
  const { t, language } = useLang();
  const stock = productStock(product);
  const soldOut = !isPurchasable(stock);
  const { min, ranged } = displayPrice(product);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr(product.name, language)}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <ProductImage
        uri={product.imageUrl}
        icon={product.icon}
        radius={radii.xl}
        dimmed={soldOut}
        style={styles.image}
      />
      <Text style={[styles.name, soldOut && styles.mutedText]} numberOfLines={1}>
        {tr(product.name, language)}
      </Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {tr(product.subtitle, language)}
      </Text>

      <View style={styles.footer}>
        {/* "From AED 8.00" is too wide for a 152px card, so the qualifier
            becomes a caption above the price instead of truncating. */}
        <View style={styles.priceColumn}>
          {ranged && <Text style={styles.priceQualifier}>{t('common.from')}</Text>}
          <Text style={[styles.price, soldOut && styles.mutedPrice]} numberOfLines={1}>
            {formatMoney(min, language)}
          </Text>
        </View>

        {soldOut ? (
          <View style={styles.notifyPill}>
            <Text style={styles.notifyLabel}>{t('stock.notifyMe')}</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('product.addToCart')}
            onPress={onAdd}
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
  card: {
    width: PRODUCT_CARD_WIDTH,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radii['4xl'],
    padding: spacing.md,
  },
  pressed: { opacity: 0.85 },
  image: { height: 104, width: '100%', flex: 0 },
  name: {
    fontSize: fontSize.body,
    fontWeight: weight.heavy,
    color: colors.ink,
    marginTop: 10,
  },
  subtitle: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.placeholder,
    marginTop: 2,
  },
  mutedText: { color: colors.placeholder },
  mutedPrice: { color: colors.disabled },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 6,
  },
  priceColumn: { flexShrink: 1 },
  priceQualifier: {
    fontSize: fontSize.micro,
    fontWeight: weight.bold,
    color: colors.placeholder,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  price: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.ink },
  addButton: {
    width: 34,
    height: 34,
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
  notifyPill: {
    height: 34,
    paddingHorizontal: 10,
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
