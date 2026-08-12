import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { StockStatus } from '../data/types';
import { useLang } from '../hooks/useLang';
import { colors, fontSize, radii, weight } from '../theme';
import { Icon } from './Icon';

/**
 * The three-state stock flag as shown in the design: green "In Stock", amber
 * "Only N left", grey "Out of Stock".
 */
export function StockBadge({
  status,
  lowStockCount,
  size = 'sm',
}: {
  status: StockStatus;
  lowStockCount?: number;
  size?: 'sm' | 'md';
}) {
  const { t } = useLang();
  const md = size === 'md';

  const tone = {
    available: { bg: colors.primarySoft, fg: colors.primaryDark },
    low: { bg: colors.warningSoft, fg: colors.warning },
    out: { bg: colors.chipDisabled, fg: colors.textTertiary },
  }[status];

  const label =
    status === 'available'
      ? t('stock.available')
      : status === 'out'
        ? t('stock.out')
        : lowStockCount != null
          ? t('stock.low', { count: lowStockCount })
          : t('stock.lowShort');

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: tone.bg },
        md ? styles.badgeMd : styles.badgeSm,
      ]}
    >
      {status === 'low' && <Icon name="error" size={md ? 16 : 13} color={tone.fg} />}
      {status === 'available' && md && <Icon name="check-circle" size={16} color={tone.fg} />}
      <Text style={[styles.label, { color: tone.fg, fontSize: md ? 12 : 10 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeSm: { height: 21, paddingHorizontal: 8, borderRadius: radii.xs },
  badgeMd: { height: 28, paddingHorizontal: 10, borderRadius: radii.md, gap: 4 },
  label: { fontWeight: weight.heavy, fontSize: fontSize.micro },
});
