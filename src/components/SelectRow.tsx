import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radii, spacing, weight } from '../theme';
import { PressableScale } from './motion';

/**
 * The radio-card used for addresses, delivery times, payment methods, slots and
 * languages. Selected cards get a brand border on a tinted ground, exactly as
 * drawn across screens 06–10b.
 */
export function SelectRow({
  selected,
  disabled,
  onPress,
  leading,
  title,
  subtitle,
  trailing,
  badge,
  accessibilityLabel,
  alignTop,
}: {
  selected: boolean;
  disabled?: boolean;
  onPress?: () => void;
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Right-hand slot: a price, a chevron, an "Edit" link. */
  trailing?: React.ReactNode;
  /** Small pill next to the title, e.g. PRIMARY / APPROVED. */
  badge?: string;
  accessibilityLabel?: string;
  alignTop?: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled}
      onPress={onPress}
      activeScale={0.985}
      style={[
        styles.row,
        alignTop && styles.rowTop,
        selected && styles.rowSelected,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected, disabled && styles.radioDisabled]} />
      {leading}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, disabled && styles.textDisabled]} numberOfLines={1}>
            {title}
          </Text>
          {!!badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{badge}</Text>
            </View>
          )}
        </View>
        {!!subtitle && (
          <Text style={[styles.subtitle, disabled && styles.subtitleDisabled]}>{subtitle}</Text>
        )}
      </View>
      {trailing}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    padding: 14,
  },
  rowTop: { alignItems: 'flex-start' },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTintedBg },
  rowDisabled: { borderColor: colors.borderLighter, backgroundColor: colors.surfaceDisabled },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderDashed,
    backgroundColor: colors.surface,
  },
  // The design draws selection as a thick ring rather than a filled dot.
  radioSelected: { borderWidth: 6, borderColor: colors.primary },
  radioDisabled: { borderColor: '#E6E9EA' },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1, fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  textDisabled: { color: colors.disabled },
  subtitle: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  subtitleDisabled: { color: colors.disabledSoft },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  badgeLabel: {
    fontSize: fontSize.micro,
    fontWeight: weight.heavy,
    color: colors.primaryDark,
    letterSpacing: 0.3,
  },
});
