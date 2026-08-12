import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLang } from '../hooks/useLang';
import { colors, fontSize, radii, weight } from '../theme';
import { Icon } from './Icon';

/**
 * −/N/+ control. `size="sm"` is the cart-row variant, `"md"` the product-detail
 * one. The minus button is white-on-grey and the plus is brand green, matching
 * the design.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max,
  size = 'sm',
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}) {
  const { t } = useLang();
  const md = size === 'md';
  const button = md ? 34 : 26;
  const icon = md ? 20 : 17;

  const canDecrease = value > min;
  const canIncrease = max == null || value < max;

  return (
    <View style={[styles.wrap, md ? styles.wrapMd : styles.wrapSm]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.remove')}
        disabled={!canDecrease}
        onPress={() => onChange(value - 1)}
        style={({ pressed }) => [
          styles.button,
          { width: button, height: button, borderRadius: md ? 11 : radii.sm },
          styles.minus,
          !canDecrease && styles.buttonDisabled,
          pressed && canDecrease && styles.pressed,
        ]}
      >
        <Icon name="remove" size={icon} color={canDecrease ? colors.inkMuted : colors.disabled} />
      </Pressable>

      <Text style={[styles.value, md && styles.valueMd]}>{value}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.continue')}
        disabled={!canIncrease}
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => [
          styles.button,
          { width: button, height: button, borderRadius: md ? 11 : radii.sm },
          styles.plus,
          !canIncrease && styles.buttonDisabled,
          pressed && canIncrease && styles.pressed,
        ]}
      >
        <Icon
          name="add"
          size={icon}
          color={canIncrease ? colors.onPrimary : colors.placeholder}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  wrapSm: { height: 36, paddingHorizontal: 6, borderRadius: radii.md, gap: 10 },
  wrapMd: { height: 46, paddingHorizontal: 8, borderRadius: radii.xl, gap: 16 },
  button: { alignItems: 'center', justifyContent: 'center' },
  minus: { backgroundColor: colors.surface },
  plus: { backgroundColor: colors.primary },
  buttonDisabled: { backgroundColor: colors.chipDisabled },
  pressed: { opacity: 0.75 },
  value: {
    fontSize: fontSize.body,
    fontWeight: weight.heavy,
    color: colors.ink,
    minWidth: 12,
    textAlign: 'center',
  },
  valueMd: { fontSize: fontSize.base, minWidth: 16 },
});
