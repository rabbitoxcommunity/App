import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { PrimaryButton, Screen, TextLink } from '../components/ui';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { useConfig } from '../store/ConfigContext';
import { useOrders } from '../store/OrdersContext';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { formatMoney } from '../utils/format';
import { notify, NotificationType } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderPlaced'>;

/**
 * The confirmation screen after checkout. A full screen rather than a toast:
 * placing an order is the end of a flow, and the reference and confirmation
 * code need somewhere to live that the customer can read at their own pace.
 */
export function OrderPlacedScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const { getOrder } = useOrders();
  const { config } = useConfig();
  const deliveryEtaMinutes = config?.settings.deliveryEtaMinutes ?? 30;
  const order = getOrder(orderId);

  // The mark springs in, then the ring pulses outward once behind it.
  const mark = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const body = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Success is confirmed in the hand as well as on screen.
    notify(NotificationType.Success);
    Animated.sequence([
      Animated.spring(mark, { toValue: 1, useNativeDriver: true, damping: 11, stiffness: 170 }),
      Animated.parallel([
        Animated.timing(ring, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(body, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [mark, ring, body]);

  const goTrack = () => navigation.replace('OrderTracking', { orderId });
  // Reset rather than navigate: checkout is behind us and must not be reachable
  // with the back gesture once the order exists.
  const goHome = () =>
    navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Home' } }] });

  return (
    <Screen>
      <View style={[styles.root, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.hero}>
          <View style={styles.markWrap}>
            <Animated.View
              style={[
                styles.ring,
                {
                  opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [
                    { scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) },
                  ],
                },
              ]}
            />
            <Animated.View style={[styles.mark, { transform: [{ scale: mark }] }]}>
              <Icon name="check" size={64} color={colors.onPrimary} />
            </Animated.View>
          </View>

          <Animated.View style={{ opacity: body }}>
            <Text style={styles.title}>{t('orderPlaced.title')}</Text>
            <Text style={styles.subtitle}>{t('orderPlaced.subtitle')}</Text>
          </Animated.View>
        </View>

        {order && (
          <Animated.View style={[styles.card, { opacity: body }]}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>
                {t('orderPlaced.reference', { reference: `#${order.reference}` })}
              </Text>
              <Text style={styles.cardValue}>{formatMoney(order.total, language)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.etaRow}>
              <Icon
                name={order.fulfillment === 'curbside' ? 'storefront' : 'delivery-scooter'}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.etaLabel}>
                {order.fulfillment === 'curbside'
                  ? t('orderPlaced.pickupReady')
                  : t('orderPlaced.deliveryEta', { minutes: deliveryEtaMinutes })}
              </Text>
            </View>

            <View style={styles.codeBlock}>
              <Text style={styles.codeLabel}>{t('tracking.confirmationCode')}</Text>
              <Text style={styles.code}>{order.confirmationCode}</Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.actions}>
          <PrimaryButton label={t('orderPlaced.track')} onPress={goTrack} iconStart="truck" />
          <TextLink
            label={t('orderPlaced.continue')}
            onPress={goHome}
            style={styles.continueLink}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: spacing.xl,
    justifyContent: 'space-between',
  },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  markWrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primarySoft,
  },
  mark: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  title: {
    fontSize: fontSize.hero,
    fontWeight: weight.heavy,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: fontSize.base,
    lineHeight: 24,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 300,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii['3xl'],
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.ink },
  cardValue: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  etaLabel: {
    flex: 1,
    fontSize: fontSize.small,
    fontWeight: weight.semibold,
    color: colors.inkMuted,
  },
  codeBlock: {
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    paddingVertical: spacing.md,
  },
  codeLabel: {
    fontSize: fontSize.tiny,
    fontWeight: weight.bold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.placeholder,
  },
  code: {
    fontSize: fontSize['4xl'],
    fontWeight: weight.heavy,
    color: colors.ink,
    letterSpacing: 6,
  },
  actions: { gap: spacing.lg, paddingTop: spacing.xl },
  continueLink: { textAlign: 'center', fontSize: fontSize.body, color: colors.inkMuted },
});
