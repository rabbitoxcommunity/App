import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../api/client';
import { Icon } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { SelectRow } from '../components/SelectRow';
import { useToast } from '../components/Toast';
import { AppHeader, Screen, TextLink } from '../components/ui';
import { t as tr } from '../data/catalog';
import type { Address, CarProfile, FulfillmentType } from '../data/types';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { type AddressDraft, useAddresses } from '../store/AddressesContext';
import { useAuth } from '../store/AuthContext';
import { useCart } from '../store/CartContext';
import { useConfig } from '../store/ConfigContext';
import { availableCredit, useOrders } from '../store/OrdersContext';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { formatAmount, formatMoney } from '../utils/format';
import { ImpactStyle } from '../utils/haptics';
import { AddressSheet } from './AddressSheet';
import { CarColourSheet } from './CarColourSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

/** Paired with their labels here so adding a body type is a one-line change. */
const BODY_TYPES = [
  { value: 'sedan', labelKey: 'checkout.sedan' },
  { value: 'suv', labelKey: 'checkout.suv' },
  { value: 'pickup', labelKey: 'checkout.pickupTruck' },
  { value: 'coupe', labelKey: 'checkout.coupe' },
] as const satisfies readonly { value: CarProfile['bodyType']; labelKey: string }[];

/**
 * Pulls a human field-level message out of an ApiError's `details`, which is
 * shaped differently depending on whether the 400 came from Zod schema
 * validation (`{ issues: [{ message, path }] }`) or a service-level
 * `AppError.validationFailed({ field: 'reason' })` call — both share the same
 * generic top-level message, so this is the only way to say what's actually wrong.
 */
function describeValidationDetails(details: unknown): string | undefined {
  if (!details || typeof details !== 'object') return undefined;
  const d = details as Record<string, unknown>;
  if (Array.isArray(d.issues) && d.issues.length > 0) {
    const first = d.issues[0] as { message?: string } | undefined;
    return first?.message;
  }
  const firstString = Object.values(d).find((v) => typeof v === 'string');
  return firstString as string | undefined;
}

export function CheckoutScreen({ navigation, route }: Props) {
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const { show, hide } = useToast();
  const { session } = useAuth();
  const { lines, totals, promoCode, fulfillment, setFulfillment, clear } = useCart();
  const { placeOrder, credit } = useOrders();
  const { config, paymentMethods: allPaymentMethods } = useConfig();

  const { addresses, addAddress, updateAddress, setPrimary } = useAddresses();

  /**
   * Undefined until the customer picks one, so the selection tracks the primary
   * address — including after the store hydrates a saved book from disk.
   */
  const [pickedAddressId, setAddressId] = useState<string>();
  const addressId =
    addresses.find((a) => a.id === pickedAddressId)?.id ??
    addresses.find((a) => a.isPrimary)?.id ??
    addresses[0]?.id;
  /** `null` while adding; the address itself while editing. */
  const [editing, setEditing] = useState<Address | null>(null);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  /** Curbside only: how close the customer already is when they order. */
  const [arrival, setArrival] = useState<'on_way' | 'near'>('on_way');
  const carColours = config?.settings.carColours ?? [];
  // The plate starts empty — it is the one field only the customer can fill in,
  // so seeding it would pass a placeholder off as an entered value.
  const [car, setCar] = useState<CarProfile>({
    plate: '',
    colour: carColours[0]?.name ?? { en: '', ar: '' },
    colourHex: carColours[0]?.hex ?? '#14181C',
    bodyType: 'sedan',
  });
  const [colourSheetOpen, setColourSheetOpen] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [placing, setPlacing] = useState(false);

  const [pickedLocation, setPickedLocation] = useState<{ latitude: number; longitude: number; label?: string; lines?: string } | null>(null);

  const openAddAddress = () => {
    setEditing(null);
    setPickedLocation(null);
    setAddressSheetOpen(true);
  };

  const openEditAddress = (address: Address) => {
    setEditing(address);
    setAddressSheetOpen(true);
  };

  const saveAddress = async (draft: AddressDraft) => {
    const finalDraft = pickedLocation
      ? { ...draft, latitude: pickedLocation.latitude, longitude: pickedLocation.longitude }
      : draft;
      
    if (editing) {
      await updateAddress(editing.id, finalDraft);
      show({ title: t('address.updated'), tone: 'success', icon: 'check-circle' });
    } else {
      // A freshly added address is what the customer wants to ship to.
      const created = await addAddress(finalDraft);
      setAddressId(created.id);
      show({ title: t('address.added'), tone: 'success', icon: 'check-circle' });
    }
    setAddressSheetOpen(false);
  };

  const isCurbside = fulfillment === 'curbside';
  const creditApproved = !!session?.customer.creditApproved;
  const headroom = availableCredit(credit);

  /** Pay Later is only offered to approved customers with enough headroom; a method must also be available for the chosen fulfillment. */
  const paymentMethods = useMemo(
    () =>
      allPaymentMethods
        .filter((m) => !m.requiresCreditApproval || creditApproved)
        .map((m) => ({
          ...m,
          disabled: m.kind === 'credit' && headroom < totals.total,
        })),
    [allPaymentMethods, creditApproved, headroom, totals.total],
  );

  const payment = paymentMethods.find((m) => m.id === paymentId) ?? paymentMethods[0];

  /** Curbside never carries a delivery fee. Home delivery is always ASAP — it no longer offers a time picker — so it always pays the flat fee shown in the estimate. */
  const deliveryFee = isCurbside ? 0 : totals.deliveryFee;
  // A client-side estimate only — `cart/price` inside `placeOrder` computes the
  // authoritative total the customer is actually charged (§8).
  const total = Math.round((totals.subtotal - totals.discount + deliveryFee) * 100) / 100;

  const place = async () => {
    if (placing || lines.length === 0 || !payment) return;

    // Catch the two fields the backend would otherwise reject with a bare
    // "request body failed validation" — checked here so the customer sees
    // exactly what's missing instead of a generic error after a round trip.
    if (!isCurbside && !addressId) {
      show({ title: t('checkout.missingAddress'), tone: 'warning', icon: 'error' });
      return;
    }
    if (isCurbside && !car.plate.trim()) {
      show({ title: t('checkout.missingPlate'), tone: 'warning', icon: 'error' });
      return;
    }

    setPlacing(true);
    show({ title: t('toast.placingOrder'), tone: 'loading', variant: 'hud' });

    try {
      const order = await placeOrder({
        fulfillment,
        lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
        promoCode: promoCode ?? undefined,
        addressId: isCurbside ? undefined : addressId,
        paymentKind: payment.kind,
        car: isCurbside ? car : undefined,
        arrival: isCurbside ? arrival : undefined,
      });

      clear();
      hide();
      // The confirmation screen carries the success message now, so a toast on
      // top of it would say the same thing twice.
      navigation.replace('OrderPlaced', { orderId: order.id });
    } catch (e) {
      hide();
      show({
        title: e instanceof ApiError ? e.message : t('toast.offlineTitle'),
        body: e instanceof ApiError ? describeValidationDetails(e.details) : undefined,
        tone: 'danger',
        icon: 'error',
      });
    } finally {
      setPlacing(false);
    }
  };

  const fulfillmentTab = (type: FulfillmentType, icon: 'delivery-scooter' | 'car') => {
    const active = fulfillment === type;
    return (
      <PressableScale
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => setFulfillment(type)}
        activeScale={0.97}
        containerStyle={styles.modeCell}
        style={[styles.modeCard, active && styles.modeCardActive]}
      >
        {/* Both glyphs default to FILL 1 elsewhere in the app; here the design
            uses the axis to carry selection — solid when active, outlined when not. */}
        <Icon
          name={icon}
          size={24}
          filled={active}
          color={active ? colors.primary : colors.inkMuted}
        />
        {/* Both labels are drawn in full in the design. On decks narrower than
            the 390pt canvas they scale down a touch rather than ellipsize. */}
        <View style={styles.modeText}>
          <Text
            style={styles.modeTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {t(type === 'curbside' ? 'checkout.curbside' : 'checkout.homeDelivery')}
          </Text>
          <Text
            style={styles.modeSubtitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {t(type === 'curbside' ? 'checkout.curbsideSub' : 'checkout.homeDeliverySub')}
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
          {fulfillmentTab('curbside', 'car')}
        </View>

        {/* Screen 06 explains curbside next to the tab that switches to it; on
            06c itself the tip is replaced by the arrival note at the bottom. */}
        {!isCurbside && (
          <FadeSlideIn>
            <View style={[styles.hintCard, styles.hintCardTop]}>
              <Icon name="info" size={20} color={colors.textSecondary} />
              <Text style={styles.hintText}>{t('checkout.curbsideHint')}</Text>
            </View>
          </FadeSlideIn>
        )}

        {isCurbside ? (
          <>
            {/* ---------------- Curbside: car, arrival (screen 06c) */}
            <Text style={styles.sectionTitleFirst}>{t('checkout.yourCar')}</Text>
            <View style={styles.carRow}>
              <View style={styles.plateField}>
                <Text style={styles.fieldLabel}>{t('checkout.plate')}</Text>
                <TextInput
                  style={styles.plateInput}
                  value={car.plate}
                  onChangeText={(plate) => setCar((c) => ({ ...c, plate }))}
                  placeholder={t('checkout.platePlaceholder')}
                  placeholderTextColor={colors.disabledSoft}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  accessibilityLabel={t('checkout.plate')}
                />
              </View>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${t('checkout.colour')}: ${tr(car.colour, language)}`}
                onPress={() => setColourSheetOpen(true)}
                activeScale={0.985}
                containerStyle={styles.colourCell}
                style={styles.colourField}
              >
                <View style={[styles.colourDot, { backgroundColor: car.colourHex }]} />
                <View style={styles.colourText}>
                  <Text style={styles.fieldLabel}>{t('checkout.colour')}</Text>
                  <Text style={styles.fieldValue} numberOfLines={1}>
                    {tr(car.colour, language)}
                  </Text>
                </View>
              </PressableScale>
            </View>

            <View style={styles.chipRow}>
              {BODY_TYPES.map(({ value, labelKey }) => {
                const active = car.bodyType === value;
                return (
                  <PressableScale
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setCar((c) => ({ ...c, bodyType: value }))}
                    style={[styles.bodyChip, active && styles.bodyChipActive]}
                  >
                    <Text style={[styles.bodyChipLabel, active && styles.bodyChipLabelActive]}>
                      {t(labelKey)}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>{t('checkout.arrival')}</Text>
            <View style={styles.stack}>
              <SelectRow
                selected={arrival === 'on_way'}
                onPress={() => setArrival('on_way')}
                title={t('checkout.onMyWay')}
                subtitle={t('checkout.onMyWayNote')}
                trailing={<Text style={styles.freeLabel}>{t('checkout.free')}</Text>}
              />
              <SelectRow
                selected={arrival === 'near'}
                onPress={() => setArrival('near')}
                title={t('checkout.nearShop')}
                subtitle={t('checkout.nearShopNote')}
                trailing={<Text style={styles.freeLabel}>{t('checkout.free')}</Text>}
              />
            </View>

            <View style={[styles.hintCard, styles.hintCardArrival]}>
              <Icon name="bell-active" size={20} color={colors.textSecondary} />
              <Text style={styles.hintText}>{t('checkout.curbsideArriveHintNoBay')}</Text>
            </View>
          </>
        ) : (
          <>
            {/* ---------------- Home delivery: address + time (screen 06) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleInline}>{t('checkout.deliveryAddress')}</Text>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('address.addTitle')}
                onPress={openAddAddress}
                style={styles.addNew}
              >
                <Icon name="add" size={17} color={colors.primary} />
                <Text style={styles.addNewLabel}>{t('checkout.addNew')}</Text>
              </PressableScale>
            </View>
            <View style={styles.stack}>
              {addresses.map((address, index) => {
                const selected = address.id === addressId;
                return (
                  <FadeSlideIn key={address.id} index={index}>
                    <SelectRow
                      alignTop
                      radius={radii['3xl']}
                      selected={selected}
                      onPress={() => setAddressId(address.id)}
                      title={tr(address.label, language)}
                      badge={address.isPrimary ? t('checkout.primary') : undefined}
                      subtitle={[tr(address.lines, language), address.phone]
                        .filter(Boolean)
                        .join('\n')}
                      footer={
                        address.isPrimary ? null : (
                          <TextLink
                            label={t('checkout.setPrimary')}
                            style={styles.setPrimary}
                            onPress={() => {
                              setPrimary(address.id);
                              setAddressId(address.id);
                            }}
                          />
                        )
                      }
                      trailing={
                        <TextLink
                          label={t('checkout.edit')}
                          style={[styles.editLink, !selected && styles.editLinkMuted]}
                          onPress={() => openEditAddress(address)}
                        />
                      }
                    />
                  </FadeSlideIn>
                );
              })}
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
                    : method.kind === 'card'
                      ? t('checkout.cardSub')
                      : method.kind === 'cash'
                        ? t('checkout.cashSub')
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
          haptic={ImpactStyle.Medium}
          onPress={place}
          style={[styles.placeButton, (placing || lines.length === 0) && styles.placeButtonDisabled]}
        >
          <Icon name={isCurbside ? 'car' : 'lock'} size={21} color={colors.onPrimary} />
          <Text style={styles.placeLabel}>
            {t('checkout.placeOrder', { total: formatAmount(total) })}
          </Text>
        </PressableScale>
      </View>

      <AddressSheet
        visible={addressSheetOpen}
        address={editing}
        pickedLocation={pickedLocation}
        onPickLocation={() => {
          setAddressSheetOpen(false);
          setTimeout(() => {
            navigation.navigate('LocationPicker', {
              onLocationPicked: (loc) => {
                setPickedLocation(loc);
                setAddressSheetOpen(true);
              },
            });
          }, 150);
        }}
        // Clearing the flag here would leave the book with no primary at all —
        // promoting a different address is what moves it.
        canUnsetPrimary={!editing?.isPrimary}
        onClose={() => setAddressSheetOpen(false)}
        onSave={saveAddress}
      />

      <CarColourSheet
        visible={colourSheetOpen}
        colours={carColours}
        selectedHex={car.colourHex}
        onClose={() => setColourSheetOpen(false)}
        onConfirm={(colour) => {
          setCar((c) => ({ ...c, colourHex: colour.hex, colour: colour.name }));
          setColourSheetOpen(false);
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
  /** Each tab takes half the row; the card inside stretches to fill its cell. */
  modeCell: { flex: 1 },
  modeCard: {
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
  },
  hintCardTop: { marginBottom: spacing.lg + 2 },
  hintCardArrival: { marginTop: spacing.lg },
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
  /** The first curbside section sits directly under the tabs, with no lead-in. */
  sectionTitleFirst: {
    fontSize: fontSize.body,
    fontWeight: weight.heavy,
    color: colors.ink,
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
  setPrimary: { fontSize: fontSize.caption, marginTop: 6 },
  freeLabel:{ fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primary },

  carRow:{ flexDirection: 'row', gap: 10 },
  /** The plate takes the larger share — it holds free text, the colour a word. */
  plateField: {
    flex: 3,
    height: 58,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  /**
   * Was a fixed 132. Now proportional, so the plate keeps the room it needs on
   * narrow decks. The flex lives on the touchable itself — `PressableScale`
   * puts `style` on the inner scaling view, where flex never reaches the row.
   */
  colourCell: { flex: 2 },
  colourField: {
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
  /**
   * Matches `fieldValue`, but zeroes the padding a `TextInput` carries by
   * default so the plate sits on the same baseline as the colour beside it.
   */
  plateInput: {
    fontSize: fontSize.bodyLg,
    fontWeight: weight.heavy,
    color: colors.ink,
    marginTop: 2,
    padding: 0,
  },

  // Wraps because a fourth chip pushes the row past the gutter on narrow decks
  // and in Arabic, where the labels run longer.
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10 },
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
