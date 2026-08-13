import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { requestStockNotification } from '../api/notifications';
import { CartPeekBar } from '../components/CartPeekBar';
import { Icon } from '../components/Icon';
import { FadeSlideIn } from '../components/motion';
import { ProductRow } from '../components/ProductRow';
import { useToast } from '../components/Toast';
import { AppHeader, EmptyState, IconButton, Screen } from '../components/ui';
import { defaultVariant, t as tr } from '../data/catalog';
import {
  activeFilterCount,
  applyFilters,
  defaultFilters,
  type FilterState,
} from '../data/filters';
import { useAddToCart } from '../hooks/useAddToCart';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { useCatalog } from '../store/CatalogContext';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { FilterSheet } from './FilterSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryListing'>;

/** Height reserved under the list so the floating cart bar never covers a row. */
const PEEK_BAR_SPACE = 92;

export function CategoryListingScreen({ route, navigation }: Props) {
  const { categoryId } = route.params;
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const { addProduct } = useAddToCart();
  const { show } = useToast();
  const { getCategory, productsInCategory, reload } = useCatalog();

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const category = getCategory(categoryId);
  const allProducts = useMemo(() => productsInCategory(categoryId), [categoryId, productsInCategory]);
  const products = useMemo(() => applyFilters(allProducts, filters), [allProducts, filters]);
  const filterCount = activeFilterCount(filters);

  const activeSubcategories = category
    ? category.subcategories.filter((s) => filters.subcategoryIds.includes(s.id))
    : [];
  const inactiveSubcategories = category
    ? category.subcategories.filter((s) => !filters.subcategoryIds.includes(s.id))
    : [];

  const toggleSubcategory = (id: string) =>
    setFilters((f) => ({
      ...f,
      subcategoryIds: f.subcategoryIds.includes(id)
        ? f.subcategoryIds.filter((s) => s !== id)
        : [...f.subcategoryIds, id],
    }));

  return (
    <Screen>
      <View style={styles.gutter}>
        <AppHeader
          title={category ? tr(category.name, language) : ''}
          onBack={navigation.goBack}
          backLabel={t('common.back')}
          trailing={<IconButton name="search" accessibilityLabel={t('common.search')} />}
        />

        {/* Filter chip row */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[...activeSubcategories, ...inactiveSubcategories]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chipRow}
          ListHeaderComponent={
            <Pressable
              accessibilityRole="button"
              onPress={() => setSheetOpen(true)}
              style={styles.filtersChip}
            >
              <Icon name="tune" size={18} color={colors.onPrimary} />
              <Text style={styles.filtersChipLabel}>{t('listing.filters')}</Text>
              {filterCount > 0 && (
                <View style={styles.filtersBadge}>
                  <Text style={styles.filtersBadgeLabel}>{filterCount}</Text>
                </View>
              )}
            </Pressable>
          }
          renderItem={({ item }) => {
            const active = filters.subcategoryIds.includes(item.id);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => toggleSubcategory(item.id)}
                style={[styles.subChip, active && styles.subChipActive]}
              >
                <Text style={[styles.subChipLabel, active && styles.subChipLabelActive]}>
                  {tr(item.name, language)}
                </Text>
                {active && <Icon name="close" size={16} color={colors.primaryDark} />}
              </Pressable>
            );
          }}
        />

        {/* Result count + current sort */}
        <View style={styles.metaRow}>
          <Text style={styles.metaCount}>
            {filters.inStockOnly
              ? t('listing.itemCountInStock', { count: products.length })
              : t('listing.itemCount', { count: products.length })}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSheetOpen(true)}
            style={styles.sortButton}
          >
            <Icon name="sort" size={17} color={colors.primary} />
            <Text style={styles.sortLabel}>{t(`filters.sort.${filters.sort}`)}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: PEEK_BAR_SPACE + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item, index }) => (
          <FadeSlideIn index={index}>
          <ProductRow
            product={item}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
            onAdd={() => addProduct(item)}
            onNotify={() => {
              requestStockNotification(defaultVariant(item).id).catch(() => undefined);
              show({
                title: t('stock.notifyMe'),
                body: tr(item.name, language),
                tone: 'success',
                icon: 'notifications',
              });
            }}
          />
          </FadeSlideIn>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            title={t('listing.empty')}
            body={t('filters.inStockOnlyHint')}
            actionLabel={t('listing.clearFilters')}
            onAction={() => setFilters(defaultFilters())}
          />
        }
      />

      <CartPeekBar
        onPress={() => navigation.navigate('Tabs', { screen: 'Cart' })}
        bottom={insets.bottom + spacing.lg}
      />

      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        subcategories={category?.subcategories ?? []}
        resultCount={(draft) => applyFilters(allProducts, draft).length}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.gutter, paddingTop: 4 },
  chipRow: { gap: spacing.sm, paddingBottom: spacing.md },
  filtersChip: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filtersChipLabel: {
    fontSize: fontSize.small,
    fontWeight: weight.heavy,
    color: colors.onPrimary,
  },
  filtersBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersBadgeLabel: { fontSize: 11, fontWeight: weight.heavy, color: colors.onPrimary },
  subChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  subChipActive: { backgroundColor: colors.primarySoft },
  subChipLabel: { fontSize: fontSize.small, fontWeight: weight.bold, color: colors.inkMuted },
  subChipLabelActive: { color: colors.primaryDark, fontWeight: weight.heavy },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaCount: {
    fontSize: fontSize.caption,
    fontWeight: weight.bold,
    color: colors.textSecondary,
  },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sortLabel: { fontSize: fontSize.caption, fontWeight: weight.heavy, color: colors.primary },
  list: { paddingHorizontal: spacing.gutter, gap: spacing.sm },
});
