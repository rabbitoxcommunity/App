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
  radius = radii['2xl'],
  titleSize = fontSize.body,
  subtitleTone = 'muted',
  footer,
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
  /** Address cards are drawn at 20; time / payment / slot rows at 18. */
  radius?: number;
  /** Slot rows in screen 06b set their title one step larger than 14. */
  titleSize?: number;
  /** The design tints "Recommended" / "Off-peak" notes brand-green. */
  subtitleTone?: 'muted' | 'brand';
  /** Extra line under the subtitle, e.g. the "Set as primary" link. */
  footer?: React.ReactNode;
}) {
  // The design leaves 3px under titles that carry a badge or sit in a top-aligned
  // address card, and 2px in the single-line time / payment / slot rows.
  const subtitleGap = alignTop || badge ? 3 : 2;
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
        { borderRadius: radius },
        alignTop && styles.rowTop,
        selected && styles.rowSelected,
        disabled && styles.rowDisabled,
      ]}
    >
      <View
        style={[
          styles.radio,
          alignTop && styles.radioTop,
          selected && styles.radioSelected,
          disabled && styles.radioDisabled,
        ]}
      />
      {leading}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { fontSize: titleSize }, disabled && styles.textDisabled]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {!!badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{badge}</Text>
            </View>
          )}
        </View>
        {!!subtitle && (
          <Text
            style={[
              styles.subtitle,
              { marginTop: subtitleGap },
              subtitleTone === 'brand' && styles.subtitleBrand,
              disabled && styles.subtitleDisabled,
            ]}
          >
            {subtitle}
          </Text>
        )}
        {footer}
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
  // Address cards align the dial with the first line of the title, not the top
  // of the card.
  radioTop: { marginTop: 2 },
  // The design draws selection as a thick ring rather than a filled dot.
  radioSelected: { borderWidth: 6, borderColor: colors.primary },
  radioDisabled: { borderColor: '#E6E9EA' },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1, fontWeight: weight.heavy, color: colors.ink },
  textDisabled: { color: colors.disabled },
  subtitle: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  subtitleBrand: { color: colors.primaryDark },
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
