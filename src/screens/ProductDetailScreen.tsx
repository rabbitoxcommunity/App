import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { CrossFade, PressableScale } from '../components/motion';
import { ProductImage } from '../components/ProductImage';
import { QuantityStepper } from '../components/QuantityStepper';
import { StockBadge } from '../components/StockBadge';
import { IconButton, PrimaryButton, Screen } from '../components/ui';
import {
  defaultVariant,
  findVariantByOptions,
  getProduct,
  hasVariants,
  isPurchasable,
  optionPrice,
  optionStock,
  t as tr,
  variantLabel,
} from '../data/catalog';
import { DELIVERY_ETA_MINUTES } from '../data/mock';
import { useAddToCart } from '../hooks/useAddToCart';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { formatAmount, formatMoney } from '../utils/format';
import { ImpactStyle, withTap } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ route, navigation }: Props) {
  const { productId, variantId } = route.params;
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const { addVariant } = useAddToCart();

  const screenWidth = Dimensions.get('window').width;
  // Size so that 3 full items fit, and the 4th peeks out to hint at scrolling
  const itemWidth = (screenWidth - spacing.gutter * 2 - 12 * 2) / 3.5;

  const product = getProduct(productId);

  // Selection is held as axis → option so the two selectors stay independent;
  // the matching SKU is derived from it.
  const [selection, setSelection] = useState<Record<string, string>>(() => {
    if (!product) return {};
    const start =
      (variantId && product.variants.find((v) => v.id === variantId)) ||
      defaultVariant(product);
    return { ...start.optionIds };
  });
  const [quantity, setQuantity] = useState(1);

  const variant = useMemo(() => {
    if (!product) return undefined;
    return hasVariants(product)
      ? findVariantByOptions(product, selection)
      : product.variants[0];
  }, [product, selection]);

  if (!product || !variant) {
    return (
      <Screen>
        <View style={styles.gutter}>
          <IconButton name="back" onPress={navigation.goBack} accessibilityLabel={t('common.back')} />
          <Text style={styles.missing}>{t('product.unavailable')}</Text>
        </View>
      </Screen>
    );
  }

  const sellable = isPurchasable(variant.stock);
  const lineTotal = variant.price * quantity;
  const discountPercent = variant.compareAtPrice
    ? Math.round((1 - variant.price / variant.compareAtPrice) * 100)
    : 0;

  /**
   * Picking an option can land on a combination that doesn't exist or is sold
   * out; when that happens we slide the other axes to the nearest sellable SKU
   * rather than showing an empty state.
   */
  const selectOption = (axisId: string, optionId: string) => {
    const candidate = { ...selection, [axisId]: optionId };
    if (findVariantByOptions(product, candidate)) {
      setSelection(candidate);
      return;
    }
    const fallback =
      product.variants.find(
        (v) => v.optionIds[axisId] === optionId && isPurchasable(v.stock),
      ) ?? product.variants.find((v) => v.optionIds[axisId] === optionId);
    if (fallback) setSelection({ ...fallback.optionIds });
  };

  const flavourAxis = product.axes.find((a) => a.id !== 'size');
  const sizeAxis = product.axes.find((a) => a.id === 'size');

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <ProductImage
            uri={product.imageUrl}
            icon={product.icon}
            radius={0}
            style={styles.heroImage}
          />
          <View style={styles.heroButtons} pointerEvents="box-none">
            <IconButton
              name="back"
              onPress={navigation.goBack}
              accessibilityLabel={t('common.back')}
              background={colors.surface}
            />
            <IconButton
              name="favorite"
              accessibilityLabel={t('common.view')}
              background={colors.surface}
              color={colors.primary}
            />
          </View>
        </View>

        <View style={styles.gutter}>
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <Text style={styles.title}>{tr(product.name, language)}</Text>
              {!!product.shelf && (
                <Text style={styles.shelf}>{tr(product.shelf, language)}</Text>
              )}
            </View>
            <StockBadge
              status={variant.stock}
              lowStockCount={variant.lowStockCount}
              size="md"
            />
          </View>

          <CrossFade sentinel={variant.id} style={styles.priceRow}>
            <Text style={styles.price}>{formatMoney(variant.price, language)}</Text>
            {!!variant.compareAtPrice && (
              <>
                <Text style={styles.comparePrice}>
                  {formatMoney(variant.compareAtPrice, language)}
                </Text>
                <View style={styles.discountPill}>
                  <Text style={styles.discountLabel}>-{discountPercent}%</Text>
                </View>
              </>
            )}
          </CrossFade>

          {/* Flavour-style axis: pill chips */}
          {flavourAxis && (
            <View style={{ marginTop: spacing['2xl'] }}>
              <Text style={styles.groupTitle}>{tr(flavourAxis.name, language)}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipWrap}>
                {flavourAxis.options.map((option) => {
                  const status = optionStock(product, flavourAxis.id, option.id, selection);
                  const disabled = status === 'out';
                  const active = selection[flavourAxis.id] === option.id;
                  return (
                    <PressableScale
                      key={option.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active, disabled }}
                      disabled={disabled}
                      onPress={() => selectOption(flavourAxis.id, option.id)}
                      style={[
                        styles.chip,
                        active && styles.chipActive,
                        disabled && styles.chipDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          active && styles.chipLabelActive,
                          disabled && styles.chipLabelDisabled,
                        ]}
                      >
                        {tr(option.name, language)}
                      </Text>
                    </PressableScale>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Size axis: cards showing the price for each size */}
          {sizeAxis && (
            <>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{tr(sizeAxis.name, language)}</Text>
                <Text style={styles.groupHint}>{t('product.priceUpdatesWithSize')}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sizeRow}>
                {sizeAxis.options.map((option) => {
                  const status = optionStock(product, sizeAxis.id, option.id, selection);
                  const disabled = status === 'out';
                  const active = selection[sizeAxis.id] === option.id;
                  const price = optionPrice(product, sizeAxis.id, option.id, selection);
                  return (
                    <View key={option.id} style={{ width: itemWidth }}>
                      <PressableScale
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active, disabled }}
                        disabled={disabled}
                        onPress={() => selectOption(sizeAxis.id, option.id)}
                        style={[
                          styles.sizeCard,
                          active && styles.sizeCardActive,
                          disabled && styles.sizeCardDisabled,
                        ]}
                      >
                        <Text
                          style={[styles.sizeName, disabled && styles.sizeTextDisabled]}
                        >
                          {tr(option.name, language)}
                        </Text>
                        <Text
                          style={[
                            styles.sizePrice,
                            active && styles.sizePriceActive,
                            disabled && styles.sizeTextDisabled,
                          ]}
                        >
                          {disabled || price == null
                            ? t('stock.out')
                            : formatMoney(price, language)}
                        </Text>
                      </PressableScale>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={styles.quantityRow}>
            <Text style={styles.groupTitle}>{t('product.quantity')}</Text>
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={1}
              size="md"
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky purchase footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.footerTop}>
          <View style={styles.footerTotals}>
            <Text style={styles.footerTotalLabel}>{t('product.total')}</Text>
            <Text style={styles.footerTotal}>{formatMoney(lineTotal, language)}</Text>
            <Text style={styles.footerBreakdown} numberOfLines={1}>
              {quantity} × {variantLabel(product, variant, language)}
            </Text>
          </View>
          <View style={styles.etaPill}>
            <Icon name="schedule" size={14} color={colors.primaryDark} />
            <Text style={styles.etaLabel}>
              {t('product.etaMinutes', { minutes: DELIVERY_ETA_MINUTES })}
            </Text>
          </View>
        </View>

        <View style={styles.footerButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('product.addToCart')}
            disabled={!sellable}
            onPress={withTap(() => addVariant(product, variant, quantity), ImpactStyle.Medium)}
            style={({ pressed }) => [
              styles.addButton,
              !sellable && styles.addButtonDisabled,
              pressed && sellable && styles.pressed,
            ]}
          >
            <Icon
              name="add-to-cart"
              size={24}
              color={sellable ? colors.primaryDark : colors.disabled}
            />
          </Pressable>
          <PrimaryButton
            label={
              sellable
                ? t('product.buyNow', { total: formatAmount(lineTotal) })
                : t('stock.out')
            }
            disabled={!sellable}
            onPress={() => {
              if (addVariant(product, variant, quantity)) {
                navigation.navigate('Tabs', { screen: 'Cart' });
              }
            }}
            iconStart="bolt"
            height={56}
            style={styles.buyButton}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  gutter: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xl },
  missing: {
    fontSize: fontSize.base,
    fontWeight: weight.bold,
    color: colors.textSecondary,
    marginTop: spacing.xl,
  },
  hero: { height: 268, backgroundColor: colors.surfaceSubtle },
  heroImage: { flex: 1, borderRadius: 0 },
  heroButtons: {
    position: 'absolute',
    top: 8,
    start: spacing.gutter,
    end: spacing.gutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  titleText: { flex: 1 },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: weight.heavy,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  shelf: {
    fontSize: fontSize.small,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 4,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: spacing.md },
  price: { fontSize: fontSize['4xl'], fontWeight: weight.heavy, color: colors.primary },
  comparePrice: {
    fontSize: fontSize.body,
    fontWeight: weight.semibold,
    color: colors.placeholder,
    textDecorationLine: 'line-through',
  },
  discountPill: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: spacing.sm,
  },
  discountLabel: { fontSize: fontSize.caption, fontWeight: weight.heavy, color: colors.warning },
  groupTitle: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing['2xl'],
    marginBottom: 14,
  },
  groupHint: {
    fontSize: fontSize.caption,
    fontWeight: weight.bold,
    color: colors.textSecondary,
  },
  chipWrap: { flexDirection: 'row', gap: 12, marginTop: 12 },
  chip: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { backgroundColor: colors.surfaceDisabled, borderColor: colors.borderLighter },
  chipLabel: { fontSize: fontSize.small, fontWeight: weight.bold, color: colors.ink },
  chipLabelActive: { color: colors.onPrimary, fontWeight: weight.heavy },
  chipLabelDisabled: { color: colors.disabled, textDecorationLine: 'line-through' },
  sizeRow: { flexDirection: 'row', gap: 12 },
  sizeCard: {
    width: '100%',
    height: 72,
    borderRadius: radii['2xl'],
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sizeCardActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  sizeCardDisabled: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.borderLighter,
  },
  sizeName: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  sizePrice: { fontSize: fontSize.tiny, fontWeight: weight.bold, color: colors.textSecondary },
  sizePriceActive: { color: colors.primaryDark },
  sizeTextDisabled: { color: colors.disabled },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing['2xl'],
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLighter,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    gap: 10,
  },
  footerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerTotals: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  footerTotalLabel: {
    fontSize: fontSize.caption,
    fontWeight: weight.bold,
    color: colors.placeholder,
  },
  footerTotal: { fontSize: fontSize['2xl'], fontWeight: weight.heavy, color: colors.ink },
  footerBreakdown: {
    flexShrink: 1,
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.placeholder,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: spacing.sm,
  },
  etaLabel: { fontSize: fontSize.tiny, fontWeight: weight.heavy, color: colors.primaryDark },
  footerButtons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addButton: {
    width: 58,
    height: 56,
    borderRadius: radii['2xl'],
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { borderColor: colors.borderLight, backgroundColor: colors.surfaceDisabled },
  pressed: { opacity: 0.8 },
  buyButton: { flex: 1 },
});
