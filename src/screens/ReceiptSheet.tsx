import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '../components/BottomSheet';
import { Icon } from '../components/Icon';
import { PrimaryButton } from '../components/ui';
import { t as tr } from '../data/catalog';
import type { Order, PaymentMethodKind } from '../data/types';
import { useLang } from '../hooks/useLang';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { formatMoney, formatShortDate } from '../utils/format';

const PAYMENT_LABEL: Record<PaymentMethodKind, string> = {
  card: 'tracking.paidWithCard',
  credit: 'tracking.paidWithCredit',
  cash: 'tracking.paidWithCash',
};

/**
 * The itemised receipt for a placed order, presented over Order history.
 *
 * Every figure is read off the order itself rather than recomputed from the
 * catalogue: `unitPrice` was captured at purchase time, so a receipt stays
 * truthful after a price change.
 */
export function ReceiptSheet({
  order,
  onClose,
}: {
  /** `null` closes the sheet; the order it should itemise otherwise. */
  order: Order | null;
  onClose: () => void;
}) {
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  // Held through the closing animation so the body does not blank out mid-slide.
  const [shown, setShown] = React.useState<Order | null>(order);
  React.useEffect(() => {
    if (order) setShown(order);
  }, [order]);

  if (!shown) return null;

  const money = (value: number) => formatMoney(value, language);

  return (
    <BottomSheet
      visible={order !== null}
      onClose={onClose}
      maxHeightRatio={0.55}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>{t('receipt.title')}</Text>
          <Text style={styles.subtitle}>
            {`#${shown.reference} · ${t('receipt.placedOn', {
              date: formatShortDate(shown.placedAt, language),
            })}`}
          </Text>
        </View>
      }
      footer={
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing['2xl'] }]}>
          <PrimaryButton label={t('receipt.done')} onPress={onClose} height={56} />
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>{t('receipt.items')}</Text>

        {shown.lines.map((line) => (
          <View key={`${line.productId}-${line.variantId}`} style={styles.line}>
            <View style={styles.lineIcon}>
              <Icon name={line.icon} size={20} color={colors.disabled} />
            </View>
            <View style={styles.lineBody}>
              <Text style={styles.lineName} numberOfLines={1}>
                {tr(line.name, language)}
              </Text>
              <Text style={styles.lineMeta} numberOfLines={1}>
                {/* `qty`, not `count` — `count` would send i18next looking for
                    plural variants of the key that do not exist. */}
                {`${tr(line.variantLabel, language)} · ${t('receipt.lineQty', {
                  qty: line.quantity,
                  price: money(line.unitPrice),
                })}`}
              </Text>
            </View>
            <Text style={styles.lineTotal}>{money(line.unitPrice * line.quantity)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        <Row label={t('receipt.subtotal')} value={money(shown.subtotal)} />
        <Row
          label={t('receipt.deliveryFee')}
          value={shown.deliveryFee === 0 ? t('checkout.free') : money(shown.deliveryFee)}
        />
        {shown.discount > 0 && (
          <Row
            label={t('receipt.discount')}
            value={`− ${money(shown.discount)}`}
            tone="discount"
          />
        )}
        <Row label={t('receipt.payment')} value={t(PAYMENT_LABEL[shown.paymentKind])} />

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('receipt.totalPaid')}</Text>
          <Text style={styles.totalValue}>{money(shown.total)}</Text>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'discount';
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, tone === 'discount' && styles.rowValueDiscount]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 2 },
  title: { fontSize: 19, fontWeight: weight.heavy, color: colors.ink },
  subtitle: {
    fontSize: fontSize.small,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 5,
  },
  body: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.tiny,
    fontWeight: weight.bold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.placeholder,
    marginBottom: spacing.md,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 14 },
  lineIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBody: { flex: 1, minWidth: 0 },
  lineName: { fontSize: fontSize.body, fontWeight: weight.bold, color: colors.ink },
  lineMeta: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lineTotal: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  rowLabel: { fontSize: fontSize.small, fontWeight: weight.semibold, color: colors.inkMuted },
  rowValue: { fontSize: fontSize.small, fontWeight: weight.bold, color: colors.ink },
  rowValueDiscount: { color: colors.primary, fontWeight: weight.heavy },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.ink },
  totalValue: { fontSize: 19, fontWeight: weight.heavy, color: colors.ink },
  footer: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg },
});
