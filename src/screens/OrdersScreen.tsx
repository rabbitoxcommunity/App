import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { useToast } from '../components/Toast';
import { OrderCardSkeleton, SkeletonList } from '../components/Skeleton';
import { EmptyState, Screen } from '../components/ui';
import type { Order } from '../data/types';
import { useLang } from '../hooks/useLang';
import type { RootNavigation } from '../navigation/types';
import { useCart } from '../store/CartContext';
import { useOrders } from '../store/OrdersContext';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { formatAmount, formatShortDate } from '../utils/format';
import { ReceiptSheet } from './ReceiptSheet';

/** How many item thumbnails a history card shows before collapsing to "+N". */
const THUMBS = 3;

/** Screen 09 — Order history, with the active order on its own tab. */
export function OrdersScreen() {
  const { t, language } = useLang();
  const navigation = useNavigation<RootNavigation>();
  const { show } = useToast();
  const { activeOrder, pastOrders, refresh, isLoading } = useOrders();
  const { addItem } = useCart();

  const [tab, setTab] = useState<'past' | 'active'>('past');
  /** The order whose receipt is open, or `null` when the sheet is closed. */
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const orders = tab === 'active' ? (activeOrder ? [activeOrder] : []) : pastOrders;

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Reading the cache takes a few milliseconds, which would fire the spinner
      // and kill it inside one frame — the pull would read as having failed. The
      // floor holds it just long enough for the gesture to land.
      await Promise.all([refresh(), new Promise((r) => setTimeout(r, 450))]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  const reorder = (order: Order) => {
    order.lines.forEach((line) => addItem(line.productId, line.variantId, line.quantity));
    show({
      title: t('orders.reordered'),
      body: t('orders.reorderedBody', {
        count: order.lines.length,
        reference: `#${order.reference}`,
      }),
      action: {
        label: t('common.view'),
        onPress: () => navigation.navigate('Tabs', { screen: 'Cart' }),
      },
    });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs', { screen: 'Home' })}
          style={styles.backButton}
        >
          <Icon name="back" size={22} color={colors.ink} />
        </PressableScale>
        <Text style={styles.title}>{t('orders.title')}</Text>
      </View>

      <View style={styles.tabs}>
        <PressableScale
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'past' }}
          onPress={() => setTab('past')}
          style={[styles.tab, tab === 'past' && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, tab === 'past' && styles.tabLabelActive]}>
            {t('orders.past')}
          </Text>
        </PressableScale>
        <PressableScale
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'active' }}
          onPress={() => setTab('active')}
          style={[styles.tab, tab === 'active' && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, tab === 'active' && styles.tabLabelActive]}>
            {t('orders.active', { count: activeOrder ? 1 : 0 })}
          </Text>
        </PressableScale>
      </View>

      {isLoading ? (
        // The persisted store is still being read: show the shape of the list
        // rather than an empty state that would be wrong a moment later.
        <View style={styles.list}>
          <SkeletonList count={3}>{() => <OrderCardSkeleton />}</SkeletonList>
        </View>
      ) : orders.length === 0 ? (
        // Scrollable even with nothing in it, so the pull gesture still works —
        // an empty list is exactly when someone reaches for refresh.
        <ScrollView
          contentContainerStyle={styles.emptyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <EmptyState
            icon="orders"
            title={t('orders.empty')}
            body={t('orders.emptyBody')}
            actionLabel={t('cart.startShopping')}
            onAction={() => navigation.navigate('Tabs', { screen: 'Home' })}
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {orders.map((order, index) => {
            const cancelled = order.status === 'cancelled';
            const live = order === activeOrder;
            const thumbs = order.lines.slice(0, THUMBS);
            const overflow = order.lines.length - thumbs.length;

            return (
              <FadeSlideIn key={order.id} index={index}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`#${order.reference}`}
                  activeScale={0.99}
                  onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.reference}>#{order.reference}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        cancelled && styles.statusPillCancelled,
                        live && styles.statusPillLive,
                      ]}
                    >
                      {!cancelled && (
                        <Icon
                          name={live ? 'truck' : 'check-circle'}
                          size={14}
                          color={live ? colors.warning : colors.primaryDark}
                        />
                      )}
                      <Text
                        style={[
                          styles.statusLabel,
                          cancelled && styles.statusLabelCancelled,
                          live && styles.statusLabelLive,
                        ]}
                      >
                        {cancelled
                          ? t('orders.cancelled')
                          : live
                            ? t('orders.inProgress')
                            : t(
                              order.fulfillment === 'pickup'
                                ? 'orders.handedOver'
                                : 'orders.delivered',
                            )}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.summary}>
                    {t('orders.summary', {
                      date: formatShortDate(order.placedAt, language),
                      count: order.lines.length,
                      total: formatAmount(order.total),
                    })}
                  </Text>

                  {!cancelled && (
                    <>
                      <View style={styles.thumbs}>
                        {thumbs.map((line) => (
                          <View key={line.variantId} style={styles.thumb}>
                            <Icon name={line.icon} size={22} color={colors.disabled} />
                          </View>
                        ))}
                        {overflow > 0 && (
                          <View style={[styles.thumb, styles.thumbOverflow]}>
                            <Text style={styles.thumbOverflowLabel}>
                              {t('orders.more', { count: overflow })}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.actions}>
                        <View style={{ flex: 1 }}>
                          <PressableScale
                            accessibilityRole="button"
                            onPress={() =>
                              live
                                ? navigation.navigate('OrderTracking', { orderId: order.id })
                                : reorder(order)
                            }
                            style={styles.primaryAction}
                          >
                            <Icon
                              name={live ? 'truck' : 'replay'}
                              size={19}
                              color={colors.onPrimary}
                            />
                            <Text style={styles.primaryActionLabel}>
                              {t(live ? 'orders.track' : 'orders.reorder')}
                            </Text>
                          </PressableScale>
                        </View>
                        <PressableScale
                          accessibilityRole="button"
                          accessibilityLabel={`${t('orders.receipt')} #${order.reference}`}
                          onPress={() => setReceiptOrder(order)}
                          style={styles.secondaryAction}
                        >
                          <Text style={styles.secondaryActionLabel}>{t('orders.receipt')}</Text>
                        </PressableScale>
                      </View>
                    </>
                  )}
                </PressableScale>
              </FadeSlideIn>
            );
          })}
        </ScrollView>
      )}

      <ReceiptSheet order={receiptOrder} onClose={() => setReceiptOrder(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.md, 
    paddingHorizontal: spacing.gutter, 
    paddingTop: spacing.md 
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: fontSize['3xl'], fontWeight: weight.heavy, color: colors.ink },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.lg,
  },
  tab: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: fontSize.small, fontWeight: weight.bold, color: colors.inkMuted },
  tabLabelActive: { color: colors.onPrimary, fontWeight: weight.heavy },

  list: { paddingHorizontal: spacing.gutter, paddingBottom: spacing['2xl'], gap: spacing.md },
  /** `flexGrow` so the empty state still centres in the viewport it scrolls in. */
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  card: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radii['4xl'],
    padding: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reference: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  statusPillCancelled: { backgroundColor: '#F1F3F4' },
  statusPillLive: { backgroundColor: colors.warningSoft },
  statusLabel: { fontSize: fontSize.tiny, fontWeight: weight.heavy, color: colors.primaryDark },
  statusLabelCancelled: { color: colors.textTertiary },
  statusLabelLive: { color: colors.warning },

  summary: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.placeholder,
    marginTop: 4,
  },
  thumbs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 13,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderDashed,
    borderStyle: 'dashed',
  },
  thumbOverflow: { backgroundColor: colors.surfaceMuted, borderWidth: 0 },
  thumbOverflowLabel: {
    fontSize: fontSize.small,
    fontWeight: weight.heavy,
    color: colors.textSecondary,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primaryAction: {
    width: '100%',
    height: 46,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionLabel: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.onPrimary },
  secondaryAction: {
    height: 46,
    paddingHorizontal: 24,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionLabel: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.inkMuted },
});
