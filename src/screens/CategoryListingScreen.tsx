import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listProducts, type ListProductsParams } from '../api/catalog';
import { toFils } from '../api/client';
import { requestStockNotification } from '../api/notifications';
import { CartPeekBar } from '../components/CartPeekBar';
import { Icon } from '../components/Icon';
import { FadeSlideIn } from '../components/motion';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { AppHeader, EmptyState, IconButton, Screen } from '../components/ui';
import { defaultVariant, t as tr } from '../data/catalog';
import {
  activeFilterCount,
  applyFilters,
  defaultFilters,
  type FilterState,
  type SortKey,
} from '../data/filters';
import type { Product } from '../data/types';
import { useAddToCart } from '../hooks/useAddToCart';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { useCatalog } from '../store/CatalogContext';
import { fontSize, radii, spacing, weight } from '../theme';
import { FilterSheet } from './FilterSheet';
import { useTheme } from "../store/ConfigContext";

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryListing'>;

/** Height reserved under the list so the floating cart bar never covers a row. */
const PEEK_BAR_SPACE = 92;

const PAGE_SIZE = 24;

/**
 * 'discount' has no server-side equivalent, so it fetches by popularity and is
 * re-sorted client-side over whatever is loaded — see the note on `sort` below.
 */
const SERVER_SORT: Record<SortKey, ListProductsParams['sort']> = {
  popular: 'popularity',
  priceAsc: 'priceAsc',
  newest: 'newest',
  discount: 'popularity',
};

/**
 * Pages this category straight from the server instead of filtering the global
 * in-memory catalogue.
 *
 * Reading `productsInCategory()` meant the screen could only be as complete as
 * the app-wide hydration behind it: opening a 1,417-product category right
 * after launch showed the count climbing 143 -> 571 -> 1092 -> 1417 over about
 * five seconds, with rows appearing under the user's thumb. One request now
 * gives the true total and a full first screen, and the rest auto-loads on
 * scroll.
 */
function useCategoryProducts(
  categoryId: string,
  sortKey: SortKey,
  inStock: boolean,
  minPrice: number,
  maxPrice: number,
) {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const pageRef = useRef(1);
  // Bumped on category/sort change so a page still in flight cannot append to
  // a list it no longer belongs to.
  const runRef = useRef(0);
  const exhaustedRef = useRef(false);

  const serverSort = SERVER_SORT[sortKey];

  const load = useCallback(async () => {
    const run = ++runRef.current;
    pageRef.current = 1;
    exhaustedRef.current = false;
    setLoading(true);
    try {
      const res = await listProducts({
        category: categoryId,
        sort: serverSort,
        inStock,
        // The app talks AED, the API stores fils.
        minPrice: toFils(minPrice),
        maxPrice: toFils(maxPrice),
        page: 1,
        limit: PAGE_SIZE,
      });
      if (run !== runRef.current) return;
      setItems(res.items);
      setTotal(res.total);
      exhaustedRef.current = res.items.length === 0 || res.items.length >= res.total;
    } catch {
      if (run !== runRef.current) return;
      setItems([]);
      setTotal(0);
      exhaustedRef.current = true;
    } finally {
      if (run === runRef.current) setLoading(false);
    }
  }, [categoryId, serverSort, inStock, minPrice, maxPrice]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (exhaustedRef.current || loading || loadingMore) return;
    const run = runRef.current;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const res = await listProducts({
        category: categoryId,
        sort: serverSort,
        inStock,
        minPrice: toFils(minPrice),
        maxPrice: toFils(maxPrice),
        page: next,
        limit: PAGE_SIZE,
      });
      if (run !== runRef.current) return;
      pageRef.current = next;
      setTotal(res.total);
      setItems((prev) => {
        // Dedupe by id: a product published or deleted between pages shifts
        // every later page, which would otherwise repeat or skip rows.
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev, ...res.items.filter((p) => !seen.has(p.id))];
        exhaustedRef.current = res.items.length === 0 || merged.length >= res.total;
        return merged;
      });
    } catch {
      // Deliberately leaves `exhausted` alone so the next scroll retries.
    } finally {
      if (run === runRef.current) setLoadingMore(false);
    }
  }, [categoryId, serverSort, inStock, minPrice, maxPrice, loading, loadingMore]);

  return { items, total, loading, loadingMore, reload: load, loadMore };
}

export function CategoryListingScreen({ route, navigation }: Props) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const { categoryId } = route.params;
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const { addProduct } = useAddToCart();
  const { show } = useToast();
  const { getCategory, getProduct, reload } = useCatalog();

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    items,
    total,
    loading: isLoading,
    loadingMore,
    reload: reloadPage,
    loadMore,
  } = useCategoryProducts(
    categoryId,
    filters.sort,
    filters.inStockOnly,
    filters.minPrice,
    filters.maxPrice,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([reloadPage(), reload()]);
    } finally {
      setRefreshing(false);
    }
  }, [reloadPage, reload]);

  const category = getCategory(categoryId);

  /**
   * Server rows are authoritative for price and identity, but stock is patched
   * live into CatalogContext by the `stock.changed` socket. Overlaying the
   * live variants keeps "changes appear instantly" true on this screen now that
   * its rows no longer come from that context.
   */
  const allProducts = useMemo(
    () =>
      items.map((p) => {
        const live = getProduct(p.id);
        return live ? { ...p, variants: live.variants } : p;
      }),
    [items, getProduct],
  );

  const products = useMemo(() => applyFilters(allProducts, filters), [allProducts, filters]);
  const filterCount = activeFilterCount(filters);

  /**
   * `total` comes from the server and already respects category + inStock, so it
   * is the honest count for those. Subcategory and price are still applied
   * client-side over loaded rows, so once either is active only the loaded rows
   * can be counted.
   */
  // Category, stock and price are all resolved server-side, so `total` is the
  // honest count for them. Subcategory is still a client-side filter over
  // loaded rows, so with one active only those rows can be counted.
  const displayCount = filters.subcategoryIds.length === 0 ? total : products.length;

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
              ? t('listing.itemCountInStock', { count: displayCount })
              : t('listing.itemCount', { count: displayCount })}
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

      {isLoading ? (
        <View style={[styles.skeletonGrid, { paddingBottom: PEEK_BAR_SPACE + insets.bottom }]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={styles.skeletonCell}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: PEEK_BAR_SPACE + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          // Auto-load the next page as the end comes into view. 0.6 fires about
          // half a screen early so the spinner is rarely seen on a fast network.
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item, index }) => (
            <FadeSlideIn index={index} style={styles.gridCell}>
            <ProductCard
              product={item}
              fluid
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
      )}

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

const makeStyles = (colors: any) => StyleSheet.create({
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
  // Row and column gutters are set independently: sm (8) read as cramped for
  // cards this tall, so both step up to lg (16).
  grid: { paddingHorizontal: spacing.gutter, gap: spacing.lg, paddingTop: 2 },
  gridRow: { gap: spacing.lg },
  // FadeSlideIn wraps each card, so the flex that makes columns share the row
  // has to live on the wrapper — not the card. maxWidth stops a lone card on a
  // final odd row from stretching across the full width.
  gridCell: { flex: 1, maxWidth: '50%' },
  skeletonGrid: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  // Slightly under half so the 16px gap has room without wrapping to one column.
  skeletonCell: { width: '47%' },
  footerLoader: { paddingVertical: spacing.lg, alignItems: 'center' },
});
