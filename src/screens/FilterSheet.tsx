import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '../components/BottomSheet';
import { Icon } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { RangeSlider } from '../components/RangeSlider';
import { PrimaryButton, TextLink } from '../components/ui';
import { t as tr } from '../data/catalog';
import { defaultFilters, PRICE_BOUNDS, SORT_KEYS, type FilterState } from '../data/filters';
import type { Subcategory } from '../data/types';
import { useLang } from '../hooks/useLang';
import { fontSize, radii, spacing, weight } from '../theme';
import { useTheme } from "../store/ConfigContext";

/**
 * Screen 03b — Filter & sort. Edits stay local until "Show N items" is pressed,
 * so dismissing the sheet leaves the listing untouched.
 */
export function FilterSheet({
  visible,
  filters,
  subcategories,
  resultCount,
  onClose,
  onApply,
}: {
  visible: boolean;
  filters: FilterState;
  subcategories: Subcategory[];
  /** Live count for the *draft* filters, computed by the caller. */
  resultCount: (draft: FilterState) => number;
  onClose: () => void;
  onApply: (next: FilterState) => void;
}) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<FilterState>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const count = useMemo(() => resultCount(draft), [draft, resultCount]);

  const toggleSubcategory = (id: string) =>
    setDraft((d) => ({
      ...d,
      subcategoryIds: d.subcategoryIds.includes(id)
        ? d.subcategoryIds.filter((s) => s !== id)
        : [...d.subcategoryIds, id],
    }));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      header={
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('filters.title')}</Text>
          <TextLink label={t('common.resetAll')} onPress={() => setDraft(defaultFilters())} />
        </View>
      }
      footer={
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing['2xl'] }]}>
          <PressableScale
            accessibilityRole="button"
            onPress={() => setDraft(defaultFilters())}
            style={styles.clearButton}
          >
            <Text style={styles.clearLabel}>{t('common.clear')}</Text>
          </PressableScale>
          <PrimaryButton
            label={t('filters.showItems', { count })}
            onPress={() => onApply(draft)}
            height={56}
            style={styles.applyButton}
          />
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {/* Sort */}
        <Text style={styles.groupTitle}>{t('filters.sortBy')}</Text>
        <View style={styles.chipWrap}>
          {SORT_KEYS.map((key) => {
            const active = draft.sort === key;
            return (
              <PressableScale
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setDraft((d) => ({ ...d, sort: key }))}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {t(`filters.sort.${key}`)}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {/* Price range */}
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>{t('filters.priceRange')}</Text>
          <Text style={styles.groupValue}>
            {t('filters.priceRangeValue', { min: draft.minPrice, max: draft.maxPrice })}
          </Text>
        </View>
        <RangeSlider
          min={PRICE_BOUNDS.min}
          max={PRICE_BOUNDS.max}
          step={1}
          low={draft.minPrice}
          high={draft.maxPrice}
          onChange={(low, high) =>
            setDraft((d) => ({ ...d, minPrice: low, maxPrice: high }))
          }
        />

        {/* Subcategories */}
        <Text style={[styles.groupTitle, styles.groupSpacer]}>{t('filters.subcategory')}</Text>
        <View>
          {subcategories.map((sub, index) => {
            const checked = draft.subcategoryIds.includes(sub.id);
            return (
              <FadeSlideIn key={sub.id} index={index}>
                <PressableScale
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  onPress={() => toggleSubcategory(sub.id)}
                  activeScale={0.99}
                  style={[styles.checkRow, index > 0 && styles.checkRowDivided]}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <Icon name="check" size={18} color={colors.onPrimary} />}
                  </View>
                  <Text style={styles.checkLabel}>{tr(sub.name, language)}</Text>
                  <Text style={styles.checkCount}>{sub.count}</Text>
                </PressableScale>
              </FadeSlideIn>
            );
          })}
        </View>

        {/* In stock only */}
        <PressableScale
          accessibilityRole="switch"
          accessibilityState={{ checked: draft.inStockOnly }}
          onPress={() => setDraft((d) => ({ ...d, inStockOnly: !d.inStockOnly }))}
          activeScale={0.99}
          style={[styles.stockCard, !draft.inStockOnly && styles.stockCardOff]}
        >
          <Icon
            name="inventory"
            size={23}
            color={draft.inStockOnly ? colors.primary : colors.placeholder}
          />
          <View style={styles.stockText}>
            <Text style={styles.stockTitle}>{t('filters.inStockOnly')}</Text>
            <Text style={styles.stockHint}>{t('filters.inStockOnlyHint')}</Text>
          </View>
          <View style={[styles.switch, draft.inStockOnly && styles.switchOn]}>
            <View style={[styles.knob, draft.inStockOnly && styles.knobOn]} />
          </View>
        </PressableScale>
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize['2xl'], fontWeight: weight.heavy, color: colors.ink },
  body: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg + 2 },
  groupTitle: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  groupSpacer: { marginTop: spacing.xl },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: 14,
  },
  groupValue: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10 },
  chip: {
    height: 40,
    paddingHorizontal: 15,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontSize: fontSize.small, fontWeight: weight.bold, color: colors.ink },
  chipLabelActive: { color: colors.onPrimary, fontWeight: weight.heavy },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 11,
    paddingHorizontal: 2,
  },
  checkRowDivided: { borderTopWidth: 1, borderTopColor: colors.borderLighter },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: spacing.sm,
    borderWidth: 2,
    borderColor: colors.checkboxBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { flex: 1, fontSize: fontSize.bodyLg, fontWeight: weight.bold, color: colors.ink },
  checkCount: { fontSize: fontSize.small, fontWeight: weight.bold, color: colors.placeholder },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primaryTintedBg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii['2xl'],
    padding: 14,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  stockCardOff: { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
  stockText: { flex: 1 },
  stockTitle: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  stockHint: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  switch: {
    width: 52,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.checkboxBorder,
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: colors.primary },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface },
  knobOn: { alignSelf: 'flex-end' },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLighter,
  },
  clearButton: {
    height: 56,
    paddingHorizontal: 22,
    borderRadius: radii['2xl'],
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearLabel: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.inkMuted },
  applyButton: { flex: 1 },
});
