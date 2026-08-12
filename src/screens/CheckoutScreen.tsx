import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { SelectRow } from '../components/SelectRow';
import { useToast } from '../components/Toast';
import { AppHeader, Screen, TextLink } from '../components/ui';
import { t as tr, variantLabel } from '../data/catalog';
import { DELIVERY_ETA_MINUTES } from '../data/mock';
import {
  ADDRESSES,
  CAR_COLOURS,
  DEFAULT_CAR,
  PAYMENT_METHODS,
  PICKUP_STORES,
} from '../data/orders';
import type {
  CarProfile,
  DeliverySlot,
  FulfillmentType,
  PaymentMethodKind,
} from '../data/types';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../store/AuthContext';
import { useCart } from '../store/CartContext';
import { availableCredit, useOrders } from '../store/OrdersContext';
import { colors, fontSize, radii, shadow, spacing, weight } from '../theme';
import { formatAmount, formatMoney } from '../utils/format';
import { SlotPickerSheet } from './SlotPickerSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

const CURBSIDE_BAY = 3;

export function CheckoutScreen({ navigation }: Props) {
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const { session } = useAuth();
  const { lines, totals, promoCode, fulfillment, setFulfillment, clear } = useCart();
  const { placeOrder, credit } = useOrders();

  const [addressId, setAddressId] = useState(
    ADDRESSES.find((a) => a.isPrimary)?.id ?? ADDRESSES[0].id,
  );
  const [timing, setTiming] = useState<'asap' | 'slot'>('asap');
  const [slot, setSlot] = useState<DeliverySlot | null>(null);
  const [slotSheetOpen, setSlotSheetOpen] = useState(false);
  const [car, setCar] = useState<CarProfile>(DEFAULT_CAR);
  const [paymentId, setPaymentId] = useState('pay-card');
  const [placing, setPlacing] = useState(false);

  const store = PICKUP_STORES[0];
  const isCurbside = fulfillment === 'pickup';
  const creditApproved = !!session?.customer.creditApproved;
  const headroom = availableCredit(credit);

  /** Pay Later is only offered to approved customers with enough headroom. */
  const paymentMethods = useMemo(
    () =>
      PAYMENT_METHODS.filter((m) => !m.requiresCreditApproval || creditApproved).map((m) => ({
        ...m,
        disabled: m.kind === 'credit' && headroom < totals.total,
      })),
    [creditApproved, headroom, totals.total],
  );

  const payment = paymentMethods.find((m) => m.id === paymentId) ?? paymentMethods[0];

  /**
   * Curbside never carries a delivery fee, and a scheduled slot overrides the
   * flat ASAP fee — including free off-peak slots.
   */
  const deliveryFee = isCurbside ? 0 : timing === 'slot' && slot ? (slot.fee ?? 0) : totals.deliveryFee;
  const total = Math.round((totals.subtotal - totals.discount + deliveryFee) * 100) / 100;

  const place = () => {
    if (placing || lines.length === 0) return;
    setPlacing(true);
    show({ title: t('toast.placingOrder'), tone: 'loading' });

    // Stands in for POST /orders.
    setTimeout(() => {
      const order = placeOrder({
        fulfillment,
        lines: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          unitPrice: line.variant.price,
          name: line.product.name,
          // Record the SKU that was actually bought, not the parent's pack size.
          variantLabel: {
            en: variantLabel(line.product, line.variant, 'en'),
            ar: variantLabel(line.product, line.variant, 'ar'),
          },
          icon: line.product.icon,
        })),
        subtotal: totals.subtotal,
        deliveryFee,
        discount: totals.discount,
        total,
        paymentKind: (payment?.kind ?? 'card') as PaymentMethodKind,
        addressId: isCurbside ? undefined : addressId,
        storeId: isCurbside ? store.id : undefined,
        slotLabel: timing === 'slot' && slot ? slot.label : undefined,
        rider: isCurbside
          ? undefined
          : { name: { en: 'Adnan', ar: 'عدنان' }, etaMinutes: DELIVERY_ETA_MINUTES },
        estimatedAt: new Date(Date.now() + DELIVERY_ETA_MINUTES * 60000).toISOString(),
      });

      clear();
      setPlacing(false);
      show({
        title: t('checkout.placed'),
        body: t('checkout.placedBody', { reference: order.reference }),
        tone: 'success',
        icon: 'check-circle',
      });
      navigation.replace('OrderTracking', { orderId: order.id });
    }, 1200);
  };

  const fulfillmentTab = (type: FulfillmentType, icon: 'delivery-scooter' | 'car') => {
    const active = fulfillment === type;
    return (
      <PressableScale
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => setFulfillment(type)}
        activeScale={0.97}
        style={[styles.modeCard, active && styles.modeCardActive]}
      >
        <Icon name={icon} size={24} color={active ? colors.primary : colors.inkMuted} />
        <View style={styles.modeText}>
          <Text style={styles.modeTitle} numberOfLines={1}>
            {t(type === 'pickup' ? 'checkout.curbside' : 'checkout.homeDelivery')}
          </Text>
          <Text style={styles.modeSubtitle} numberOfLines={1}>
            {t(type === 'pickup' ? 'checkout.curbsideSub' : 'checkout.homeDeliverySub')}
          </Text>
        </View>
      </PressableScale>
    );
  };

  return (
    <Screen>
      <View style={styles.gutter}>
        <AppHeader
          title={t('checkout.title')}
          onBack={navigation.goBack}
          backLabel={t('common.back')}
          align="start"
          trailing={null}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Fulfillment type */}
        <View style={styles.modeRow}>
          {fulfillmentTab('delivery', 'delivery-scooter')}
          {fulfillmentTab('pickup', 'car')}
        </View>

        {isCurbside && (
          <FadeSlideIn>
            <View style={styles.hintCard}>
              <Icon name="info" size={20} color={colors.textSecondary} />
              <Text style={styles.hintText}>{t('checkout.curbsideHint')}</Text>
            </View>
          </FadeSlideIn>
        )}

        {isCurbside ? (
          <>
            {/* ---------------- Curbside: store, car, arrival (screen 06c) */}
            <Text style={styles.sectionTitle}>{t('checkout.pickupStore')}</Text>
            <View style={styles.storeCard}>
              <Icon name="storefront" size={24} color={colors.primary} />
              <View style={styles.storeBody}>
                <Text style={styles.storeName}>{tr(store.name, language)}</Text>
                <Text style={styles.storeDetails}>{tr(store.details, language)}</Text>
                <View style={styles.baysPill}>
                  <Icon name="parking" size={14} color={colors.primaryDark} />
                  <Text style={styles.baysLabel}>
                    {t('checkout.baysFree', { count: store.baysFree })}
                  </Text>
                </View>
              </View>
              <TextLink label={t('checkout.change')} />
            </View>

            <Text style={styles.sectionTitle}>{t('checkout.yourCar')}</Text>
            <View style={styles.carRow}>
              <View style={styles.plateField}>
                <Text style={styles.fieldLabel}>{t('checkout.plate')}</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {car.plate}
                </Text>
              </View>
              <View style={styles.colourField}>
                <View style={[styles.colourDot, { backgroundColor: car.colourHex }]} />
                <View style={styles.colourText}>
                  <Text style={styles.fieldLabel}>{t('checkout.colour')}</Text>
                  <Text style={styles.fieldValue} numberOfLines={1}>
                    {tr(car.colour, language)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.chipRow}>
              {CAR_COLOURS.map((option) => (
                <PressableScale
                  key={option.hex}
                  accessibilityRole="button"
                  accessibilityLabel={tr(option.name, language)}
                  accessibilityState={{ selected: car.colourHex === option.hex }}
                  onPress={() => setCar((c) => ({ ...c, colourHex: option.hex, colour: option.name }))}
                  style={[
                    styles.colourSwatch,
                    { backgroundColor: option.hex },
                    car.colourHex === option.hex && styles.colourSwatchActive,
                  ]}
                >
                  <View />
                </PressableScale>
              ))}
            </View>

            <View style={styles.chipRow}>
              {(['sedan', 'suv', 'pickup'] as const).map((body) => {
                const active = car.bodyType === body;
                return (
                  <PressableScale
                    key={body}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setCar((c) => ({ ...c, bodyType: body }))}
                    style={[styles.bodyChip, active && styles.bodyChipActive]}
                  >
                    <Text style={[styles.bodyChipLabel, active && styles.bodyChipLabelActive]}>
                      {t(
                        body === 'sedan'
                          ? 'checkout.sedan'
                          : body === 'suv'
                            ? 'checkout.suv'
                            : 'checkout.pickupTruck',
                      )}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>{t('checkout.arrival')}</Text>
            <View style={styles.stack}>
              <SelectRow
                selected={timing === 'asap'}
                onPress={() => setTiming('asap')}
                title={t('checkout.onMyWay')}
                subtitle={t('checkout.onMyWayNote')}
                trailing={<Text style={styles.freeLabel}>{t('checkout.free')}</Text>}
              />
              <SelectRow
                selected={timing === 'slot'}
                onPress={() => {
                  setTiming('slot');
                  setSlotSheetOpen(true);
                }}
                title={t('checkout.pickTime')}
                subtitle={slot ? tr(slot.label, language) : t('slots.subtitle')}
                trailing={<Icon name="expand" size={20} color={colors.placeholder} />}
              />
            </View>

            <View style={styles.hintCard}>
              <Icon name="bell-active" size={20} color={colors.textSecondary} />
              <Text style={styles.hintText}>
                {t('checkout.curbsideArriveHint', { bay: CURBSIDE_BAY })}
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* ---------------- Home delivery: address + time (screen 06) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleInline}>{t('checkout.deliveryAddress')}</Text>
              <PressableScale accessibilityRole="button" style={styles.addNew}>
                <Icon name="add" size={17} color={colors.primary} />
                <Text style={styles.addNewLabel}>{t('checkout.addNew')}</Text>
              </PressableScale>
            </View>
            <View style={styles.stack}>
              {ADDRESSES.map((address, index) => {
                const selected = address.id === addressId;
                return (
                  <FadeSlideIn key={address.id} index={index}>
                    <SelectRow
                      alignTop
                      selected={selected}
                      onPress={() => setAddressId(address.id)}
                      title={tr(address.label, language)}
                      badge={address.isPrimary ? t('checkout.primary') : undefined}
                      subtitle={[tr(address.lines, language), address.phone]
                        .filter(Boolean)
                        .join('\n')}
                      trailing={
                        <Text style={[styles.editLink, !selected && styles.editLinkMuted]}>
                          {t('checkout.edit')}
                        </Text>
                      }
                    />
                  </FadeSlideIn>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>{t('checkout.deliveryTime')}</Text>
            <View style={styles.stack}>
              <SelectRow
                selected={timing === 'asap'}
                onPress={() => setTiming('asap')}
                title={t('checkout.asap')}
                subtitle={t('checkout.asapNote')}
                trailing={
                  <Text style={styles.feeLabel}>{formatMoney(totals.deliveryFee, language)}</Text>
                }
              />
              <SelectRow
                selected={timing === 'slot'}
                onPress={() => {
                  setTiming('slot');
                  setSlotSheetOpen(true);
                }}
                title={t('checkout.scheduleSlot')}
                subtitle={slot ? tr(slot.label, language) : t('slots.subtitle')}
                trailing={<Icon name="expand" size={20} color={colors.placeholder} />}
              />
            </View>
          </>
        )}

        {/* Payment */}
        <Text style={styles.sectionTitle}>{t('checkout.paymentMethod')}</Text>
        <View style={styles.stack}>
          {paymentMethods.map((method, index) => (
            <FadeSlideIn key={method.id} index={index}>
              <SelectRow
                selected={payment?.id === method.id}
                disabled={method.disabled}
                onPress={() => setPaymentId(method.id)}
                leading={
                  <Icon
                    name={method.kind === 'card' ? 'card' : method.kind === 'credit' ? 'wallet' : 'cash'}
                    size={24}
                    color={
                      method.disabled
                        ? colors.disabled
                        : method.kind === 'credit'
                          ? colors.primary
                          : colors.inkMuted
                    }
                  />
                }
                title={tr(method.title, language)}
                badge={method.kind === 'credit' ? t('checkout.creditApproved') : undefined}
                subtitle={
                  method.kind === 'credit'
                    ? method.disabled
                      ? t('checkout.creditTooLow')
                      : t('checkout.creditAvailable', {
                          available: formatAmount(headroom),
                          limit: formatAmount(credit.limit),
                        })
                    : method.subtitle
                      ? tr(method.subtitle, language)
                      : undefined
                }
              />
            </FadeSlideIn>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <SummaryRow
            label={t('checkout.summaryItems', { count: totals.itemCount })}
            value={formatMoney(totals.subtotal, language)}
          />
          <SummaryRow
            label={t('checkout.summaryDelivery')}
            value={deliveryFee === 0 ? t('checkout.free') : formatMoney(deliveryFee, language)}
          />
          {totals.discount > 0 && (
            <SummaryRow
              label={t('checkout.summaryPromo', { code: promoCode })}
              value={`− ${formatMoney(totals.discount, language)}`}
              highlight
            />
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>{t('checkout.totalToPay')}</Text>
            <Text style={styles.summaryTotalValue}>{formatMoney(total, language)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place order */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: placing || lines.length === 0 }}
          disabled={placing || lines.length === 0}
          onPress={place}
          style={[styles.placeButton, (placing || lines.length === 0) && styles.placeButtonDisabled]}
        >
          <Icon name={isCurbside ? 'car' : 'lock'} size={21} color={colors.onPrimary} />
          <Text style={styles.placeLabel}>
            {t('checkout.placeOrder', { total: formatAmount(total) })}
          </Text>
        </PressableScale>
      </View>

      <SlotPickerSheet
        visible={slotSheetOpen}
        selectedSlotId={slot?.id}
        onClose={() => {
          setSlotSheetOpen(false);
          if (!slot) setTiming('asap');
        }}
        onConfirm={(picked) => {
          setSlot(picked);
          setTiming('slot');
          setSlotSheetOpen(false);
        }}
      />
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
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.gutter, paddingTop: 4 },
  content: { paddingHorizontal: spacing.gutter, paddingBottom: spacing['2xl'] },
  stack: { gap: 10 },

  modeRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg + 2 },
  modeCard: {
    flex: 1,
    height: 70,
    borderRadius: radii['2xl'],
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
  },
  modeCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryTintedBg },
  modeText: { flex: 1, minWidth: 0 },
  modeTitle: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  modeSubtitle: {
    fontSize: fontSize.tiny,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },

  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.xl,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: spacing.lg + 2,
  },
  hintText: {
    flex: 1,
    fontSize: fontSize.tiny,
    fontWeight: weight.semibold,
    color: colors.inkMuted,
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: weight.heavy,
    color: colors.ink,
    marginTop: spacing.xl,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleInline: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  addNew: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addNewLabel: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primary },

  editLink: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primary },
  editLinkMuted: { color: colors.placeholder },
  feeLabel: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primary },
  freeLabel: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primary },

  storeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryTintedBg,
    borderRadius: radii['3xl'],
    padding: 14,
  },
  storeBody: { flex: 1, minWidth: 0 },
  storeName: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  storeDetails: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 3,
  },
  baysPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: spacing.sm,
    marginTop: spacing.sm,
  },
  baysLabel: { fontSize: fontSize.tiny, fontWeight: weight.heavy, color: colors.primaryDark },

  carRow: { flexDirection: 'row', gap: 10 },
  plateField: {
    flex: 1,
    height: 58,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  colourField: {
    width: 132,
    height: 58,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  colourDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colourText: { flex: 1, minWidth: 0 },
  fieldLabel: {
    fontSize: fontSize.micro,
    fontWeight: weight.bold,
    color: colors.placeholder,
    letterSpacing: 0.5,
  },
  fieldValue: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.ink, marginTop: 2 },

  chipRow: { flexDirection: 'row', gap: 9, marginTop: 10 },
  colourSwatch: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  colourSwatchActive: { borderWidth: 3, borderColor: colors.primary },
  bodyChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bodyChipLabel: { fontSize: fontSize.small, fontWeight: weight.bold, color: colors.ink },
  bodyChipLabelActive: { color: colors.onPrimary, fontWeight: weight.heavy },

  summary: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii['3xl'],
    padding: spacing.lg,
    marginTop: spacing.lg + 2,
    gap: 9,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: fontSize.small, fontWeight: weight.semibold, color: colors.inkMuted },
  summaryValue: { fontSize: fontSize.small, fontWeight: weight.bold, color: colors.ink },
  summaryValueHighlight: { color: colors.primary, fontWeight: weight.heavy },
  summaryDivider: { height: 1, backgroundColor: '#E6E9EA' },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTotalLabel: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.ink },
  summaryTotalValue: { fontSize: 19, fontWeight: weight.heavy, color: colors.ink },

  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLighter,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.gutter,
    paddingTop: 14,
  },
  placeButton: {
    height: 58,
    borderRadius: radii['2xl'],
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  placeButtonDisabled: { backgroundColor: colors.chipDisabled, shadowOpacity: 0 },
  placeLabel: { fontSize: fontSize.base, fontWeight: weight.heavy, color: colors.onPrimary },
});
