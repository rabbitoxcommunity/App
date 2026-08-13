import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import {
  AnimatedConnector,
  FadeSlideIn,
  PressableScale,
  Pulse,
} from '../components/motion';
import { useToast } from '../components/Toast';
import { AppHeader, EmptyState, PrimaryButton, Screen } from '../components/ui';
import { t as tr } from '../data/catalog';
import { flowFor, type Order, type OrderStatus } from '../data/types';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { useConfig } from '../store/ConfigContext';
import { useOrders } from '../store/OrdersContext';
import { colors, fontSize, radii, spacing, weight } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderTracking'>;

/** Milestone glyphs, per flow. */
const STATUS_ICON: Record<OrderStatus, IconName> = {
  placed: 'check',
  packed: 'check',
  out_for_delivery: 'truck',
  delivered: 'home',
  ready_for_pickup: 'storefront',
  customer_arrived: 'car',
  handed_over: 'handshake',
  cancelled: 'close',
};

export function OrderTrackingScreen({ route, navigation }: Props) {
  const { t } = useLang();
  const { show } = useToast();
  const { getOrder, activeOrder, markArrived } = useOrders();

  const order = route.params?.orderId ? getOrder(route.params.orderId) : activeOrder;

  if (!order) {
    return (
      <Screen>
        <View style={styles.gutter}>
          <AppHeader
            title={t('tabs.orders')}
            onBack={navigation.canGoBack() ? navigation.goBack : undefined}
            backLabel={t('common.back')}
            align="start"
            trailing={null}
          />
        </View>
        <EmptyState
          icon="orders"
          title={t('tracking.noActive')}
          body={t('tracking.noActiveBody')}
          actionLabel={t('cart.startShopping')}
          onAction={() => navigation.navigate('Tabs', { screen: 'Home' })}
        />
      </Screen>
    );
  }

  return <TrackingBody order={order} navigation={navigation} onArrived={markArrived} show={show} />;
}

function TrackingBody({
  order,
  navigation,
  onArrived,
  show,
}: {
  order: Order;
  navigation: Props['navigation'];
  onArrived: (id: string) => void;
  show: ReturnType<typeof useToast>['show'];
}) {
  const { t, language } = useLang();
  const { config } = useConfig();
  const isCurbside = order.fulfillment === 'curbside';
  const store = config?.store;

  const flow = useMemo(() => flowFor(order.fulfillment), [order.fulfillment]);
  const currentIndex = flow.indexOf(order.status);

  const timeOf = (status: OrderStatus) => {
    const event = order.events.find((e) => e.status === status);
    return event?.at ? formatTime(event.at, language) : undefined;
  };

  const noteFor = (status: OrderStatus): string => {
    const event = order.events.find((e) => e.status === status);
    if (event?.note) return tr(event.note, language);
    if (status === 'placed') {
      return t(
        order.paymentKind === 'credit'
          ? 'tracking.paidWithCredit'
          : order.paymentKind === 'cash'
            ? 'tracking.paidWithCash'
            : 'tracking.paidWithCard',
      );
    }
    return t(`tracking.statusNote.${status}`, { count: order.lines.length });
  };

  const canSayArrived = isCurbside && order.status === 'ready_for_pickup';
  const bayHint =
    order.bay != null ? t('tracking.arrivedHint', { bay: order.bay }) : t('tracking.arrivedHintNoBay');

  return (
    <Screen>
      <View style={styles.gutter}>
        <View style={styles.header}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate('Tabs', { screen: 'Orders' })
            }
            style={styles.backButton}
          >
            <Icon name="back" size={22} color={colors.ink} />
          </PressableScale>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              {t('tracking.orderRef', { reference: order.reference })}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t('tracking.placedAt', { time: formatTime(order.placedAt, language) })}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Rider (delivery) or store (curbside) */}
        <FadeSlideIn>
          {isCurbside && store ? (
            <View style={styles.partyCard}>
              <View style={styles.storeAvatar}>
                <Icon name="storefront" size={24} color={colors.primary} />
              </View>
              <View style={styles.partyBody}>
                <Text style={styles.partyName}>{tr(store.name, language)}</Text>
                <Text style={styles.partyNote}>{tr(store.details, language)}</Text>
              </View>
            </View>
          ) : !isCurbside ? (
            order.rider && (
              <View style={styles.partyCard}>
                <View style={styles.riderAvatar}>
                  <Icon name="account" size={24} color={colors.placeholder} />
                </View>
                <View style={styles.partyBody}>
                  <Text style={styles.partyName}>
                    {t('tracking.rider', { name: tr(order.rider.name, language) })}
                  </Text>
                  <Text style={styles.partyNote}>
                    {t('tracking.riderEta', { minutes: order.rider.etaMinutes })}
                  </Text>
                </View>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={t('tracking.callRider')}
                  onPress={() =>
                    show({ title: t('tracking.callRider'), tone: 'success', icon: 'call' })
                  }
                  style={styles.callButton}
                >
                  <Icon name="call" size={21} color={colors.primary} />
                </PressableScale>
              </View>
            )
          ) : null}
        </FadeSlideIn>

        {/* Confirmation code */}
        <FadeSlideIn index={1}>
          <View style={styles.codeCard}>
            <View style={styles.codeText}>
              <Text style={styles.codeLabel}>{t('tracking.confirmationCode')}</Text>
              <Text style={styles.codeHint}>
                {t(isCurbside ? 'tracking.confirmationHintPickup' : 'tracking.confirmationHint')}
              </Text>
            </View>
            <View style={styles.codeDigits}>
              {order.confirmationCode.split('').map((digit, index) => (
                <View key={index} style={styles.codeDigit}>
                  <Text style={styles.codeDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeSlideIn>

        {/* Curbside: tell the store you've parked */}
        {isCurbside && (
          <FadeSlideIn index={2}>
            <View style={styles.arrivedBlock}>
              <PrimaryButton
                label={t('tracking.arrivedCta')}
                iconStart="car"
                height={56}
                disabled={!canSayArrived}
                onPress={() => {
                  onArrived(order.id);
                  show({
                    title: t('tracking.status.customer_arrived'),
                    body: bayHint,
                    tone: 'success',
                    icon: 'parking',
                  });
                }}
              />
              <Text style={styles.arrivedHint}>{bayHint}</Text>
            </View>
          </FadeSlideIn>
        )}

        {/* Milestone timeline */}
        <View style={styles.timeline}>
          {flow.map((status, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;
            const pending = index > currentIndex;
            const isLast = index === flow.length - 1;

            return (
              <FadeSlideIn key={status} index={index + 3} style={styles.step}>
                <View style={styles.stepRail}>
                  <Pulse size={30} active={active}>
                    <View
                      style={[
                        styles.stepDot,
                        (done || active) && styles.stepDotDone,
                        pending && styles.stepDotPending,
                      ]}
                    >
                      <Icon
                        name={done ? 'check' : STATUS_ICON[status]}
                        size={done ? 19 : 18}
                        color={pending ? colors.disabledSoft : colors.onPrimary}
                      />
                    </View>
                  </Pulse>
                  {!isLast && (
                    <AnimatedConnector
                      active={done}
                      color={colors.primary}
                      delay={index * 120}
                    />
                  )}
                </View>

                <View style={styles.stepBody}>
                  <Text
                    style={[
                      styles.stepTitle,
                      active && styles.stepTitleActive,
                      pending && styles.stepTitlePending,
                    ]}
                  >
                    {t(`tracking.status.${status}`)}
                  </Text>
                  <Text style={[styles.stepNote, pending && styles.stepNotePending]}>
                    {pending
                      ? isLast && order.estimatedAt
                        ? t('tracking.estimated', {
                            time: formatTime(order.estimatedAt, language),
                          })
                        : noteFor(status)
                      : `${timeOf(status) ?? ''}${timeOf(status) ? ' · ' : ''}${noteFor(status)}`}
                  </Text>
                </View>
              </FadeSlideIn>
            );
          })}
        </View>

        {/* Items in this order */}
        <Text style={styles.itemsTitle}>{t('checkout.summaryItems', { count: order.lines.length })}</Text>
        <View style={styles.items}>
          {order.lines.map((line, index) => (
            <FadeSlideIn key={line.variantId} index={index}>
              <View style={styles.itemRow}>
                <View style={styles.itemIcon}>
                  <Icon name={line.icon} size={20} color={colors.disabled} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {tr(line.name, language)}
                  </Text>
                  <Text style={styles.itemVariant} numberOfLines={1}>
                    {tr(line.variantLabel, language)}
                  </Text>
                </View>
                <Text style={styles.itemQty}>×{line.quantity}</Text>
              </View>
            </FadeSlideIn>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function formatTime(iso: string, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
    hour: 'numeric',
    minute: '2-digit',
    numberingSystem: 'latn',
  }).format(date);
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.gutter, paddingTop: 4 },
  content: { paddingHorizontal: spacing.gutter, paddingBottom: spacing['2xl'] },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 6, paddingBottom: spacing.lg },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: fontSize.base, fontWeight: weight.heavy, color: colors.ink },
  headerSubtitle: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },

  partyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radii['3xl'],
    padding: spacing.md,
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyBody: { flex: 1, minWidth: 0 },
  partyName: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  partyNote: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callButton: {
    width: 42,
    height: 42,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primarySoft,
    borderRadius: radii['4xl'],
    paddingVertical: spacing.lg,
    paddingHorizontal: 18,
    marginTop: 14,
  },
  codeText: { flex: 1, minWidth: 0 },
  codeLabel: {
    fontSize: fontSize.caption,
    fontWeight: weight.heavy,
    color: colors.primaryDark,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  codeHint: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.inkMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  codeDigits: { flexDirection: 'row', gap: 7 },
  codeDigit: {
    width: 38,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigitText: { fontSize: fontSize['3xl'], fontWeight: weight.heavy, color: colors.ink },

  arrivedBlock: { marginTop: 14, gap: spacing.sm },
  arrivedHint: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  timeline: { marginTop: spacing.xl },
  step: { flexDirection: 'row', gap: 14 },
  stepRail: { alignItems: 'center' },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: colors.primary },
  stepDotPending: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: '#E6E9EA',
  },
  stepBody: { flex: 1, paddingBottom: 14 },
  stepTitle: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  stepTitleActive: { color: colors.primary },
  stepTitlePending: { color: colors.disabled },
  stepNote: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stepNotePending: { color: colors.disabledSoft },

  itemsTitle: {
    fontSize: fontSize.body,
    fontWeight: weight.heavy,
    color: colors.ink,
    marginTop: spacing.sm,
    marginBottom: 10,
  },
  items: { gap: spacing.sm },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radii['2xl'],
    padding: 10,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1, minWidth: 0 },
  itemName: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  itemVariant: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.placeholder,
    marginTop: 2,
  },
  itemQty: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.inkMuted },
});
