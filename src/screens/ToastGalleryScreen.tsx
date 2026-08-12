import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { useToast, type ToastOptions } from '../components/Toast';
import { AppHeader, Screen } from '../components/ui';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { colors, fontSize, radii, spacing, weight } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ToastGallery'>;

/**
 * Screen 03c — the toast catalogue. Every variant the app can raise is listed
 * here as a live preview, so design and QA can check them without having to
 * reproduce the state that triggers each one.
 */
export function ToastGalleryScreen({ navigation }: Props) {
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
  const tone = sample.tone ?? 'dark';
  const dark = tone === 'dark' || tone === 'loading';

  const palette = {
    dark: { bg: colors.ink, title: colors.onPrimary, body: 'rgba(255,255,255,0.65)', action: colors.primaryOnDark, icon: colors.onPrimary },
    loading: { bg: colors.ink, title: colors.onPrimary, body: 'rgba(255,255,255,0.65)', action: colors.primaryOnDark, icon: colors.onPrimary },
    warning: { bg: colors.warningSoft, border: colors.warningSoftBorder, title: colors.warningInk, body: colors.warningInkSoft, action: colors.warning, icon: colors.warning },
    danger: { bg: colors.dangerSoft, border: colors.dangerSoftBorder, title: colors.dangerInk, body: colors.dangerInkSoft, action: colors.danger, icon: colors.danger },
    success: { bg: colors.primarySoft, border: colors.primarySoftBorder, title: colors.primaryDarker, body: '#4A8C2C', action: colors.primaryDark, icon: colors.primaryDark },
  }[tone] as {
    bg: string;
    border?: string;
    title: string;
    body: string;
    action: string;
    icon: string;
  };

  return (
    <View
      style={[
        styles.toast,
        { backgroundColor: palette.bg },
        palette.border ? { borderWidth: 1.5, borderColor: palette.border } : null,
        dark ? styles.toastShadow : null,
      ]}
    >
      {tone === 'loading' ? (
        <ActivityIndicator color={colors.primaryOnDark} />
      ) : sample.icon ? (
        <Icon name={sample.icon as IconName} size={24} color={palette.icon} />
      ) : (
        <View style={styles.checkBubble}>
          <Icon name="check" size={19} color={colors.onPrimary} />
        </View>
      )}

      <View style={styles.toastText}>
        <Text style={[styles.toastTitle, { color: palette.title }]}>{sample.title}</Text>
        {!!sample.body && (
          <Text style={[styles.toastBody, { color: palette.body }]}>{sample.body}</Text>
        )}
      </View>

      {sample.action && (
        <Text style={[styles.toastAction, { color: palette.action }]}>
          {sample.action.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii['2xl'],
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  toastShadow: {
    shadowColor: colors.ink,
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  checkBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: { flex: 1 },
  toastTitle: { fontSize: fontSize.body, fontWeight: weight.heavy },
  toastBody: { fontSize: fontSize.caption, fontWeight: weight.semibold, marginTop: 2 },
  toastAction: { fontSize: fontSize.small, fontWeight: weight.heavy },
});
