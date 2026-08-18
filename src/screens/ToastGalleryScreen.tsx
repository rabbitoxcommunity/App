import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { Icon, type IconName } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { useToast, type ToastOptions } from '../components/Toast';
import { AppHeader, Screen } from '../components/ui';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { fontSize, radii, spacing, weight } from '../theme';
import { useTheme } from "../store/ConfigContext";

type Props = NativeStackScreenProps<RootStackParamList, 'ToastGallery'>;

/**
 * Screen 03c — the toast catalogue. Every variant the app can raise is listed
 * here as a live preview, so design and QA can check them without having to
 * reproduce the state that triggers each one.
 */
export function ToastGalleryScreen({ navigation }: Props) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const { t } = useLang();
  const { show } = useToast();

  const samples: (ToastOptions & { key: string })[] = [
    {
      key: 'added',
      title: t('toast.addedToCart'),
      body: 'Fresh Milk · 2 L',
      action: { label: t('common.view'), onPress: () => undefined },
    },
    {
      key: 'removed',
      title: t('toast.removed'),
      icon: 'delete',
      action: { label: t('common.undo'), onPress: () => undefined },
    },
    {
      key: 'lowStock',
      title: t('toast.lowStockTitle', { count: 3 }),
      body: t('toast.lowStockBody'),
      tone: 'warning',
      icon: 'error',
    },
    {
      key: 'offline',
      title: t('toast.offlineTitle'),
      body: t('toast.offlineBody'),
      tone: 'danger',
      icon: 'offline',
      action: { label: t('common.retry'), onPress: () => undefined },
    },
    {
      key: 'promo',
      title: t('toast.promoApplied', { code: 'FRESH10' }),
      body: t('toast.promoSaved', { value: '3.75' }),
      tone: 'success',
      icon: 'promo',
    },
    {
      key: 'placing',
      title: t('toast.placingOrder'),
      tone: 'loading',
      duration: 2000,
    },
  ];

  return (
    <Screen>
      <View style={styles.gutter}>
        <AppHeader
          title={t('toastGallery.title')}
          onBack={navigation.goBack}
          backLabel={t('common.back')}
          align="start"
          trailing={null}
        />
        <Text style={styles.subtitle}>{t('toastGallery.subtitle')}</Text>
        <Text style={styles.hint}>{t('toastGallery.tap')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {samples.map((sample, index) => (
          <FadeSlideIn key={sample.key} index={index}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={sample.title}
              onPress={() => show(sample)}
              activeScale={0.985}
            >
              <ToastPreview sample={sample} />
            </PressableScale>
          </FadeSlideIn>
        ))}
      </ScrollView>
    </Screen>
  );
}

/** A static rendering of a toast, matching the live component's styling. */
function ToastPreview({ sample }: { sample: ToastOptions }) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const tone = sample.tone ?? 'dark';

  // Mirrors ACCENT in components/Toast.tsx: one frosted fill for every tone,
  // severity carried by the icon colour alone.
  const accent = {
    dark: colors.onPrimary,
    loading: colors.onPrimary,
    success: colors.primaryOnDark,
    warning: colors.warningBright,
    danger: colors.dangerBright,
  }[tone] as string;

  return (
    <View style={styles.previewRow}>
      <BlurView intensity={60} tint="systemThickMaterialDark" style={styles.capsule}>
        {tone === 'loading' ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Icon name={(sample.icon ?? 'check') as IconName} size={18} color={accent} />
        )}

        <View style={styles.capsuleText}>
          <Text style={styles.capsuleTitle} numberOfLines={1}>{sample.title}</Text>
          {!!sample.body && (
            <Text style={styles.capsuleBody} numberOfLines={1}>{sample.body}</Text>
          )}
        </View>

        {sample.action && (
          <View style={styles.capsuleActionButton}>
            <Text style={styles.capsuleAction}>{sample.action.label}</Text>
          </View>
        )}
      </BlurView>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  gutter: { paddingHorizontal: spacing.gutter, paddingTop: 4 },
  subtitle: {
    fontSize: fontSize.caption,
    fontWeight: weight.bold,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  hint: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.placeholder,
    marginBottom: spacing.md,
  },
  list: { paddingHorizontal: spacing.gutter, paddingBottom: spacing['2xl'], gap: spacing.md },
  // Centres each sample the way the live toast centres itself on screen.
  previewRow: { alignItems: 'center' },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 22, 19, 0.82)',
    maxWidth: '92%',
    shadowColor: colors.ink,
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  capsuleText: { flexShrink: 1 },
  capsuleTitle: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.onPrimary },
  capsuleBody: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.onPrimaryMuted,
    marginTop: 1,
  },
  capsuleActionButton: {
    paddingStart: spacing.sm,
    marginStart: 2,
    borderStartWidth: StyleSheet.hairlineWidth,
    borderStartColor: 'rgba(255,255,255,0.25)',
  },
  capsuleAction: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primaryOnDark },
});
