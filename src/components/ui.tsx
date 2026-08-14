import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, radii, spacing, weight } from '../theme';
import { ImpactStyle, withTap } from '../utils/haptics';
import { Icon, type IconName } from './Icon';
import { useTheme } from "../store/ConfigContext";

/* ------------------------------------------------------------------ Screen */

/**
 * Screen chrome shared by every route: white background and top safe-area
 * padding. Bottom inset is left to the tab bar or the screen's own footer.
 */
export function Screen({
  children,
  style,
  backgroundColor,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const bg = backgroundColor ?? colors.surface;
  return (
    <View style={[{ flex: 1, backgroundColor: bg, paddingTop: insets.top }, style]}>{children}</View>
  );
}

/* ------------------------------------------------------------------ Header */

/** 42×42 rounded square button used for back / search / notifications. */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  color,
  background,
  badge,
  style,
}: {
  name: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  color?: string;
  background?: string;
  badge?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={withTap(onPress)}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: background ?? colors.surface, opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Icon name={name} size={22} color={color ?? colors.ink} />
      {badge && <View style={styles.iconButtonBadge} />}
    </Pressable>
  );
}

/** Back button + centred title + optional trailing slot. */
export function AppHeader({
  title,
  onBack,
  backLabel,
  trailing,
  align = 'center',
}: {
  title: string;
  onBack?: () => void;
  backLabel: string;
  trailing?: React.ReactNode;
  align?: 'center' | 'start';
}) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      {onBack ? (
        <IconButton name="back" onPress={onBack} accessibilityLabel={backLabel} />
      ) : (
        <View style={styles.iconButtonSpacer} />
      )}
      <Text
        style={[styles.headerTitle, align === 'start' && styles.headerTitleStart]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {trailing ?? <View style={styles.iconButtonSpacer} />}
    </View>
  );
}

/* ------------------------------------------------------------------ Buttons */

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  iconEnd,
  iconStart,
  style,
  height = 62,
  labelSize = fontSize.lg,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  iconEnd?: IconName;
  iconStart?: IconName;
  style?: StyleProp<ViewStyle>;
  height?: number;
  /** Sheet CTAs are drawn a step smaller than full-width screen CTAs. */
  labelSize?: number;
}) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      // Medium: these are the app's committing actions (Place order, Checkout,
      // Save), so they land heavier than an ordinary row or chip.
      onPress={withTap(onPress, ImpactStyle.Medium)}
      style={({ pressed }) => [
        styles.primaryButton,
        { height },
        !inactive && theme.shadow.primaryCta,
        inactive && styles.primaryButtonDisabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <>
          {iconStart && <Icon name={iconStart} size={21} color={colors.onPrimary} />}
          <Text style={[styles.primaryButtonLabel, { fontSize: labelSize }]}>{label}</Text>
          {iconEnd && <Icon name={iconEnd} size={20} color={colors.onPrimary} />}
        </>
      )}
    </Pressable>
  );
}

export function TextLink({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<TextStyle>;
}) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress}>
      {({ pressed }) => (
        <Text style={[styles.link, pressed && { opacity: 0.6 }, style]}>{label}</Text>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Sections */

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? <TextLink label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  style,
}: {
  icon: IconName;
  title: string;
  body: string;
  style?: StyleProp<ViewStyle>;
  actionLabel?: string;
  onAction?: () => void;
}) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={40} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel ? (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          height={52}
          style={styles.emptyAction}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSpacer: { width: 42, height: 42 },
  iconButtonBadge: {
    position: 'absolute',
    top: 9,
    end: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: weight.heavy,
    color: colors.ink,
  },
  headerTitleStart: { textAlign: 'left', writingDirection: 'auto' },
  primaryButton: {
    borderRadius: radii['2xl'],
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonDisabled: { backgroundColor: colors.chipDisabled },
  primaryButtonLabel: {
    fontWeight: weight.heavy,
    color: colors.onPrimary,
  },
  pressed: { opacity: 0.85 },
  link: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primary },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: weight.heavy, color: colors.ink },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: spacing.sm },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: radii['5xl'],
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: weight.heavy, color: colors.ink },
  emptyBody: {
    fontSize: fontSize.body,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyAction: { alignSelf: 'stretch', marginTop: spacing.lg },
});
