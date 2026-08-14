import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { useToast } from '../components/Toast';
import { Screen } from '../components/ui';
import { useLocale } from '../i18n/LocaleProvider';
import { useLang } from '../hooks/useLang';
import { useGlassTabBarHeight } from '../navigation/GlassTabBar';
import type { RootNavigation } from '../navigation/types';
import { useAuth } from '../store/AuthContext';
import { useOrders } from '../store/OrdersContext';
import { fontSize, radii, spacing, weight } from '../theme';
import { formatMoney } from '../utils/format';
import { LanguageSheet } from './LanguageSheet';
import { useTheme } from "../store/ConfigContext";

/** Screen 10 — Account. */
export function AccountScreen() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const { t, language } = useLang();
  const { language: current } = useLocale();
  const { session, signOut } = useAuth();
  const { credit } = useOrders();
  const { show } = useToast();
  const navigation = useNavigation<RootNavigation>();
  const tabBarHeight = useGlassTabBarHeight();

  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);

  const rows: {
    key: string;
    icon: IconName;
    label: string;
    value?: string;
    highlight?: boolean;
    onPress?: () => void;
  }[] = [
    {
      key: 'addresses',
      icon: 'location',
      label: t('account.addresses'),
      onPress: () => navigation.navigate('Addresses'),
    },
    {
      key: 'credit',
      icon: 'wallet',
      label: t('account.credit'),
      value: session?.customer.creditApproved
        ? formatMoney(credit.balance, language)
        : undefined,
      highlight: true,
      onPress: () => navigation.navigate('MyCredit'),
    },
    {
      key: 'language',
      icon: 'language',
      label: t('account.language'),
      value: current === 'ar' ? 'العربية' : 'English',
      onPress: () => setLanguageSheetOpen(true),
    },
    {
      key: 'help',
      icon: 'support',
      label: t('account.help'),
      onPress: () => show({ title: t('account.help'), icon: 'support' }),
    },
  ];

  // Screen 03c is a design/QA reference rather than a customer destination, so
  // it is only reachable from a development build.
  if (__DEV__) {
    rows.push({
      key: 'toasts',
      icon: 'bell-active',
      label: t('toastGallery.title'),
      onPress: () => navigation.navigate('ToastGallery'),
    });
  }

  const confirmSignOut = () =>
    Alert.alert(t('account.signOutConfirm'), t('account.signOutBody'), [
      { text: t('account.cancel'), style: 'cancel' },
      { text: t('account.signOut'), style: 'destructive', onPress: signOut },
    ]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t('account.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <FadeSlideIn>
          <PressableScale
            accessibilityRole="button"
            activeScale={0.99}
            onPress={() => show({ title: session?.customer.name ?? '', icon: 'account' })}
            style={styles.profile}
          >
            <View style={styles.avatar}>
              <Icon name="account" size={26} color={colors.placeholder} />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={1}>
                {session?.customer.name ?? '—'}
              </Text>
              <Text style={styles.profilePhone} numberOfLines={1}>
                {session?.customer.phone ?? ''}
              </Text>
            </View>
            <Icon name="chevron" size={22} color={colors.disabledSoft} />
          </PressableScale>
        </FadeSlideIn>

        {/* Rows */}
        <View style={styles.rows}>
          {rows.map((row, index) => {
            const isLanguage = row.key === 'language';
            return (
              <FadeSlideIn key={row.key} index={index + 1}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={row.label}
                  onPress={row.onPress}
                  activeScale={0.985}
                  style={[
                    styles.row,
                    // The design highlights the language row on a tinted card.
                    isLanguage ? styles.rowHighlighted : null,
                    !isLanguage && index > 0 ? styles.rowDivided : null,
                  ]}
                >
                  <Icon
                    name={row.icon}
                    size={23}
                    color={row.highlight || isLanguage ? colors.primary : colors.inkMuted}
                  />
                  <Text style={[styles.rowLabel, isLanguage && styles.rowLabelStrong]}>
                    {row.label}
                  </Text>
                  {!!row.value && (
                    <Text style={[styles.rowValue, row.highlight && styles.rowValueStrong]}>
                      {row.value}
                    </Text>
                  )}
                  {!row.highlight && (
                    <Icon
                      name="chevron"
                      size={22}
                      color={isLanguage ? colors.primary : colors.disabledSoft}
                    />
                  )}
                </PressableScale>
              </FadeSlideIn>
            );
          })}
        </View>

        <PressableScale
          accessibilityRole="button"
          onPress={confirmSignOut}
          style={styles.signOut}
        >
          <Text style={styles.signOutLabel}>{t('account.signOut')}</Text>
        </PressableScale>
      </ScrollView>

      <LanguageSheet visible={languageSheetOpen} onClose={() => setLanguageSheetOpen(false)} />
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { paddingHorizontal: spacing.gutter, paddingTop: spacing.md },
  title: { fontSize: fontSize['3xl'], fontWeight: weight.heavy, color: colors.ink },
  content: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg, paddingBottom: 32 },

  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radii['4xl'],
    padding: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontSize: fontSize.base, fontWeight: weight.heavy, color: colors.ink },
  profilePhone: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 3,
    writingDirection: 'ltr',
  },

  rows: { marginTop: 14, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 4,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: colors.borderLighter },
  rowHighlighted: {
    paddingHorizontal: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryTintedBg,
  },
  rowLabel: { flex: 1, fontSize: fontSize.bodyLg, fontWeight: weight.bold, color: colors.ink },
  rowLabelStrong: { fontWeight: weight.heavy },
  rowValue: { fontSize: fontSize.small, fontWeight: weight.bold, color: colors.textSecondary },
  rowValueStrong: { fontWeight: weight.heavy, color: colors.primary },

  signOut: {
    height: 56,
    borderRadius: radii['2xl'],
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  signOutLabel: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.danger },
});
