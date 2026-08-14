import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState, useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../components/Icon';
import { AnimatedBar, AnimatedNumber, FadeSlideIn, PressableScale } from '../components/motion';
import { Skeleton, SkeletonList } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { AppHeader, EmptyState, Screen } from '../components/ui';
import { t as tr } from '../data/catalog';
import type { CreditEntry } from '../data/types';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../store/AuthContext';
import { availableCredit, useOrders } from '../store/OrdersContext';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { formatAmount, formatMoney, formatShortDate } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'MyCredit'>;

/**
 * Screen 08 — My Credit / My Tab. This is the customer's view of the same
 * ledger the shop owner keeps, so the balance, the limit and every line here
 * must reconcile with their side exactly.
 */
export function MyCreditScreen({ navigation }: Props) {
  const { t, language } = useLang();
  const { show } = useToast();
  const { session } = useAuth();
  const { credit, isLoading, refresh } = useOrders();
  const [monthFilter] = useState<string | null>(null);

  const headroom = availableCredit(credit);
  const usedRatio = credit.limit > 0 ? credit.balance / credit.limit : 0;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const entries = useMemo(
    () =>
      [...credit.entries].sort((a, b) => b.at.localeCompare(a.at)).filter((entry) => {
        if (!monthFilter) return true;
        return entry.at.slice(0, 7) === monthFilter;
      }),
    [credit.entries, monthFilter],
  );

  const currentMonth = new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
    month: 'long',
  }).format(new Date());

  if (!session?.customer.creditApproved) {
    return (
      <Screen>
        <View style={styles.gutter}>
          <AppHeader
            title={t('credit.title')}
            onBack={navigation.goBack}
            backLabel={t('common.back')}
            align="start"
            trailing={null}
          />
        </View>
        <EmptyState
          icon="wallet"
          title={t('credit.notApproved')}
          body={t('credit.notApprovedBody')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.gutter}>
        <AppHeader
          title={t('credit.title')}
          onBack={navigation.goBack}
          backLabel={t('common.back')}
          align="start"
          trailing={null}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {isLoading ? (
          <View>
            <Skeleton width="100%" height={240} radius={radii['5xl'] - 2} />
            
            <View style={styles.historyHeader}>
              <Skeleton width={120} height={20} />
              <Skeleton width={80} height={20} />
            </View>
            
            <SkeletonList count={4} gap={10}>
              {() => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderColor: colors.borderLight, borderRadius: radii['2xl'], padding: 13 }}>
                  <Skeleton width={40} height={40} radius={13} />
                  <View style={{ flex: 1 }}>
                    <Skeleton width="80%" height={16} style={{ marginBottom: 6 }} />
                    <Skeleton width="50%" height={12} />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Skeleton width={60} height={16} style={{ marginBottom: 6 }} />
                    <Skeleton width={40} height={14} radius={radii.xs} />
                  </View>
                </View>
              )}
            </SkeletonList>
          </View>
        ) : (
          <>
            {/* Balance card */}
            <FadeSlideIn>
              <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{t('credit.outstanding')}</Text>
            <AnimatedNumber
              value={credit.balance}
              format={(v) => formatMoney(v, language)}
              style={styles.balanceValue}
            />
            <Text style={styles.balanceDue}>
              {t('credit.dueBy', { date: formatShortDate(credit.dueDate, language) })}
            </Text>

            <AnimatedBar progress={usedRatio} height={8} style={styles.balanceBar} />

            <View style={styles.balanceMeta}>
              <Text style={styles.balanceMetaText}>
                {t('credit.available', { available: formatAmount(headroom) })}
              </Text>
              <Text style={styles.balanceMetaText}>
                {t('credit.limit', { limit: formatAmount(credit.limit) })}
              </Text>
            </View>

            {/* No online payment gateway in v1 (BACKEND-DESIGN D12) — settling a
                tab happens at the shop or by bank transfer, and staff record it
                on their side; this only tells the customer how. */}
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ disabled: credit.balance <= 0 }}
              disabled={credit.balance <= 0}
              onPress={() => {
                show({
                  title: t('credit.settleInfoTitle'),
                  body: t('credit.settleInfoBody'),
                  tone: 'success',
                  icon: 'cash',
                });
              }}
              style={[styles.payButton, credit.balance <= 0 && styles.payButtonDisabled]}
            >
              <Icon
                name="cash"
                size={20}
                color={credit.balance <= 0 ? colors.disabled : colors.primaryDark}
              />
              <Text
                style={[styles.payLabel, credit.balance <= 0 && styles.payLabelDisabled]}
              >
                {t('credit.payNow')}
              </Text>
            </PressableScale>
          </View>
        </FadeSlideIn>

        {/* History */}
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>{t('credit.history')}</Text>
          <PressableScale accessibilityRole="button" style={styles.monthChip}>
            <Text style={styles.monthLabel}>{currentMonth}</Text>
            <Icon name="expand" size={18} color={colors.primary} />
          </PressableScale>
        </View>

        {entries.length === 0 ? (
          <Text style={styles.empty}>{t('credit.empty')}</Text>
        ) : (
          <View style={styles.entries}>
            {entries.map((entry, index) => (
              <FadeSlideIn key={entry.id} index={index}>
                <CreditRow entry={entry} />
              </FadeSlideIn>
            ))}
          </View>
        )}

            <View style={styles.trustCard}>
              <Icon name="shield" size={20} color={colors.textSecondary} />
              <Text style={styles.trustText}>{t('credit.trustNote')}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function CreditRow({ entry }: { entry: CreditEntry }) {
  const { t, language } = useLang();
  const isPayment = entry.kind === 'payment';

  return (
    <View style={styles.entryRow}>
      <View style={[styles.entryIcon, isPayment && styles.entryIconPayment]}>
        <Icon
          name={isPayment ? 'arrow-in' : 'basket'}
          size={21}
          color={isPayment ? colors.primary : colors.inkMuted}
        />
      </View>

      <View style={styles.entryBody}>
        <Text style={styles.entryTitle} numberOfLines={1}>
          {tr(entry.title, language)}
        </Text>
        <Text style={styles.entrySubtitle} numberOfLines={1}>
          {tr(entry.subtitle, language)}
        </Text>
      </View>

      <View style={styles.entryTrailing}>
        <Text style={[styles.entryAmount, isPayment && styles.entryAmountPayment]}>
          {isPayment ? '− ' : '+ '}
          {formatMoney(Math.abs(entry.amount), language)}
        </Text>
        <View style={[styles.statusPill, entry.settled ? styles.statusPaid : styles.statusUnpaid]}>
          <Text
            style={[
              styles.statusLabel,
              entry.settled ? styles.statusLabelPaid : styles.statusLabelUnpaid,
            ]}
          >
            {t(entry.settled ? 'credit.paid' : 'credit.unpaid')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.gutter, paddingTop: 4 },
  content: { paddingHorizontal: spacing.gutter, paddingBottom: spacing['2xl'] },

  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radii['5xl'] - 2,
    padding: spacing.xl,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  balanceLabel: {
    fontSize: fontSize.caption,
    fontWeight: weight.bold,
    color: colors.onPrimary,
    opacity: 0.9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: fontSize.hero,
    fontWeight: weight.heavy,
    color: colors.onPrimary,
    letterSpacing: -0.8,
    marginTop: 6,
  },
  balanceDue: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.onPrimary,
    opacity: 0.9,
    marginTop: 4,
  },
  balanceBar: { marginTop: spacing.lg },
  balanceMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  balanceMetaText: {
    fontSize: fontSize.caption,
    fontWeight: weight.bold,
    color: colors.onPrimary,
    opacity: 0.95,
  },
  payButton: {
    height: 48,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  payButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.55)' },
  payLabel: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.primaryDark },
  payLabelDisabled: { color: colors.disabled },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  historyTitle: { fontSize: fontSize.base, fontWeight: weight.heavy, color: colors.ink },
  monthChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  monthLabel: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primary },

  entries: { gap: 10 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radii['2xl'],
    padding: 13,
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryIconPayment: { backgroundColor: colors.primarySoft },
  entryBody: { flex: 1, minWidth: 0 },
  entryTitle: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  entrySubtitle: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.placeholder,
    marginTop: 2,
  },
  entryTrailing: { alignItems: 'flex-end' },
  entryAmount: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  entryAmountPayment: { color: colors.primary },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.xs, marginTop: 4 },
  statusPaid: { backgroundColor: colors.primarySoft },
  statusUnpaid: { backgroundColor: colors.warningSoft },
  statusLabel: { fontSize: fontSize.tiny, fontWeight: weight.heavy },
  statusLabelPaid: { color: colors.primaryDark },
  statusLabelUnpaid: { color: colors.warning },

  empty: {
    fontSize: fontSize.body,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  trustText: {
    flex: 1,
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.inkMuted,
    lineHeight: 18,
  },
});
