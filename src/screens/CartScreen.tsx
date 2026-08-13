import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { AnimatedNumber, FadeSlideIn } from '../components/motion';
import { ProductImage } from '../components/ProductImage';
import { QuantityStepper } from '../components/QuantityStepper';
import { useToast } from '../components/Toast';
import { EmptyState, Screen, TextLink } from '../components/ui';
import { t as tr, variantLabel } from '../data/catalog';
import { useLang } from '../hooks/useLang';
import { useGlassTabBarHeight } from '../navigation/GlassTabBar';
import type { RootNavigation } from '../navigation/types';
import { useCart, type ResolvedCartLine } from '../store/CartContext';
import { colors, fontSize, radii, shadow, spacing, weight } from '../theme';
import { formatMoney } from '../utils/format';
import { ImpactStyle, withTap } from '../utils/haptics';

export function CartScreen() {
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigation>();
  const { show } = useToast();
  const {
    lines,
    totals,
    promoCode,
    setQuantity,
    removeItem,
    addItem,
    clear,
    applyPromo,
    removePromo,
  } = useCart();

  const [promoInput, setPromoInput] = useState('');
  const tabBarHeight = useGlassTabBarHeight();

  const onRemove = (line: ResolvedCartLine) => {
    const { productId, variantId, quantity } = line;
    removeItem(variantId);
    show({
      title: t('toast.removed'),
      icon: 'delete',
      // Undo restores the exact quantity that was removed.
      action: { label: t('common.undo'), onPress: () => addItem(productId, variantId, quantity) },
    });
  };

  const onApplyPromo = () => {
    const code = promoInput.trim();
    if (!code) return;
    if (applyPromo(code)) {
      setPromoInput('');
      show({
        title: t('toast.promoApplied', { code: code.toUpperCase() }),
        tone: 'success',
        icon: 'promo',
      });
    } else {
      show({ title: t('toast.promoInvalid'), tone: 'warning', icon: 'error' });
    }
  };

  const confirmClear = () =>
    Alert.alert(
      t('cart.clearConfirmTitle'),
      t('cart.clearConfirmBody', { count: totals.itemCount }),
      [
        { text: t('cart.cancel'), style: 'cancel' },
        { text: t('cart.clear'), style: 'destructive', onPress: clear },
      ],
    );

  if (lines.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('cart.title', { count: 0 })}</Text>
        </View>
        <EmptyState
          style={{ paddingBottom: tabBarHeight }}
          icon="cart-outline"
          title={t('cart.emptyTitle')}
          body={t('cart.emptyBody')}
          actionLabel={t('cart.startShopping')}
          onAction={() => navigation.navigate('Tabs', { screen: 'Home' })}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.bottom + 80}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('cart.title', { count: totals.itemCount })}</Text>
          <TextLink label={t('cart.clear')} onPress={confirmClear} style={styles.clearLink} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {lines.map((line, index) => (
            <FadeSlideIn key={line.variantId} index={index} style={styles.line}>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('ProductDetail', {
                    productId: line.productId,
                    variantId: line.variantId,
                  })
                }
              >
                <ProductImage
                  uri={line.product.imageUrl}
                  icon={line.product.icon}
                  size={62}
                  radius={radii.lg}
                />
              </Pressable>

              <View style={styles.lineBody}>
                <Text style={styles.lineName} numberOfLines={1}>
                  {tr(line.product.name, language)}
                </Text>
                <Text style={styles.lineVariant} numberOfLines={1}>
                  {variantLabel(line.product, line.variant, language)}
                </Text>
                <Text style={styles.linePrice}>{formatMoney(line.lineTotal, language)}</Text>
              </View>

              <View style={styles.lineTrailing}>
                <QuantityStepper
                  value={line.quantity}
                  min={1}
                  onChange={(next) => setQuantity(line.variantId, next)}
                />
                <TextLink
                  label={t('common.remove')}
                  onPress={() => onRemove(line)}
                  style={styles.removeLink}
                />
              </View>
            </FadeSlideIn>
          ))}

          {/* Promo code */}
          <View style={styles.promoRow}>
            <View style={styles.promoField}>
              <Icon name="promo" size={20} color={colors.primary} />
              <TextInput
                style={styles.promoInput}
                value={promoCode ?? promoInput}
                editable={!promoCode}
                onChangeText={setPromoInput}
                onSubmitEditing={onApplyPromo}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={t('cart.promoPlaceholder')}
                placeholderTextColor={colors.placeholder}
                accessibilityLabel={t('cart.promoPlaceholder')}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={withTap(promoCode ? removePromo : onApplyPromo)}
              style={({ pressed }) => [styles.promoButton, pressed && styles.pressed]}
            >
              <Text style={styles.promoButtonLabel}>
                {promoCode ? t('common.remove') : t('common.apply')}
              </Text>
            </Pressable>
          </View>

          {/* Totals */}
          <View style={styles.summary}>
            <SummaryRow
              label={t('cart.subtotal')}
              value={formatMoney(totals.subtotal, language)}
            />
            <SummaryRow
              label={t('cart.deliveryFee')}
              value={formatMoney(totals.deliveryFee, language)}
            />
            {totals.discount > 0 && (
              <SummaryRow
                label={t('cart.promo', { code: promoCode })}
                value={`− ${formatMoney(totals.discount, language)}`}
                highlight
              />
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>{t('cart.total')}</Text>
              <AnimatedNumber
                value={totals.total}
                format={(v) => formatMoney(v, language)}
                style={styles.summaryTotalValue}
              />
            </View>
          </View>
        </ScrollView>

        {/* Checkout bar */}
        <View style={[styles.checkoutWrap, { paddingBottom: tabBarHeight }]}>
          <Pressable
            accessibilityRole="button"
            onPress={withTap(() => navigation.navigate('Checkout'), ImpactStyle.Medium)}
            style={({ pressed }) => [styles.checkoutBar, shadow.primaryCta, pressed && styles.pressed]}
          >
            <View style={styles.checkoutText}>
              <Text style={styles.checkoutLabel}>
                {t('cart.totalItems', { count: totals.itemCount })}
              </Text>
              <AnimatedNumber
                value={totals.total}
                format={(v) => formatMoney(v, language)}
                style={styles.checkoutTotal}
              />
            </View>
            <View style={styles.checkoutCta}>
              <Text style={styles.checkoutCtaLabel}>{t('cart.checkout')}</Text>
              <Icon name="forward" size={19} color={colors.primaryDark} />
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: 10,
    paddingBottom: spacing.lg,
  },
  headerSpacer: { width: 44 },
  headerTitle: {
    flex: 1,
    textAlign: 'left',
    fontSize: fontSize['3xl'],
    fontWeight: weight.heavy,
    color: colors.ink,
  },
  clearLink: { width: 44, textAlign: 'right', color: colors.placeholder },
  content: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.lg, gap: spacing.md },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radii['3xl'],
    padding: spacing.sm,
  },
  lineBody: { flex: 1, minWidth: 0 },
  lineName: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  lineVariant: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.placeholder,
    marginTop: 2,
  },
  linePrice: {
    fontSize: fontSize.body,
    fontWeight: weight.heavy,
    color: colors.primary,
    marginTop: 5,
  },
  lineTrailing: { alignItems: 'flex-end', gap: spacing.sm },
  removeLink: { fontSize: fontSize.tiny, fontWeight: weight.bold, color: colors.disabled },
  promoRow: { flexDirection: 'row', gap: 10, marginTop: spacing.sm },
  promoField: {
    flex: 1,
    height: 50,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  promoInput: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: weight.semibold,
    color: colors.ink,
  },
  promoButton: {
    height: 50,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoButtonLabel: {
    fontSize: fontSize.body,
    fontWeight: weight.heavy,
    color: colors.primaryDark,
  },
  pressed: { opacity: 0.85 },
  summary: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii['3xl'],
    padding: 14,
    gap: spacing.sm,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: {
    fontSize: fontSize.body,
    fontWeight: weight.semibold,
    color: colors.inkMuted,
  },
  summaryValue: { fontSize: fontSize.body, fontWeight: weight.bold, color: colors.ink },
  summaryValueHighlight: { color: colors.primary, fontWeight: weight.heavy },
  summaryDivider: { height: 1, backgroundColor: '#E6E9EA' },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTotalLabel: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.ink },
  summaryTotalValue: { fontSize: 19, fontWeight: weight.heavy, color: colors.ink },
  checkoutWrap: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: 14,
    backgroundColor: colors.surface,
  },
  checkoutBar: {
    height: 62,
    borderRadius: radii['2xl'],
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingStart: 18,
    paddingEnd: spacing.sm,
  },
  checkoutText: { flex: 1 },
  checkoutLabel: {
    fontSize: fontSize.tiny,
    fontWeight: weight.bold,
    color: colors.onPrimaryMuted,
  },
  checkoutTotal: {
    fontSize: fontSize.xl,
    fontWeight: weight.heavy,
    color: colors.onPrimary,
    marginTop: 1,
  },
  checkoutCta: {
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkoutCtaLabel: {
    fontSize: fontSize.bodyLg,
    fontWeight: weight.heavy,
    color: colors.primaryDark,
  },
});
