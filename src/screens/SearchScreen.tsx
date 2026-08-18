import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { searchProducts } from '../api/catalog';
import { toFils } from '../api/client';
import { requestStockNotification } from '../api/notifications';
import { CartPeekBar } from '../components/CartPeekBar';
import { Icon } from '../components/Icon';
import { FadeSlideIn } from '../components/motion';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { EmptyState, IconButton, Screen } from '../components/ui';
import { defaultVariant, t as tr } from '../data/catalog';
import { applyFilters, defaultFilters, type FilterState, type SortKey } from '../data/filters';
import type { Product } from '../data/types';
import { useAddToCart } from '../hooks/useAddToCart';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { useCatalog } from '../store/CatalogContext';
import { useSearchHistory } from '../store/SearchHistoryContext';
import { fontSize, radii, spacing, weight } from '../theme';
import { FilterSheet } from './FilterSheet';
import { useTheme } from "../store/ConfigContext";

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

const PAGE_SIZE = 24;
const DEBOUNCE_MS = 300;

const SERVER_SORT: Record<SortKey, 'popularity' | 'newest' | 'priceAsc' | 'priceDesc'> = {
  popular: 'popularity',
  priceAsc: 'priceAsc',
  newest: 'newest',
  discount: 'popularity',
};

/**
 * Server-side search, paged.
 *
 * This screen used to filter the in-memory catalogue with
 * `name.includes(query)`, which could only see what had already hydrated, never
 * matched a barcode, and never hit /search — so the shop's trending-search
 * analytics recorded nothing at all. The endpoint matches prefix tokens
 * (barcodes included) and writes a searchLog per query.
 */
function useProductSearch(query: string, sortKey: SortKey, inStock: boolean, minPrice: number, maxPrice: number | null) {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  // Span of THIS result set, for the filter slider.
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const runRef = useRef(0);
  const exhaustedRef = useRef(false);

  const trimmed = query.trim();
  const serverSort = SERVER_SORT[sortKey];
  const params = useMemo(
    () => ({
      sort: serverSort,
      inStock,
      minPrice: toFils(minPrice),
      ...(maxPrice != null ? { maxPrice: toFils(maxPrice) } : {}),
      limit: PAGE_SIZE,
    }),
    [serverSort, inStock, minPrice, maxPrice],
  );

  // Debounced so typing does not fire (and log) a query per keystroke.
  useEffect(() => {
    if (!trimmed) {
      runRef.current += 1;
      setItems([]);
      setTotal(0);
      setLoading(false);
      exhaustedRef.current = true;
      return undefined;
    }
    const timer = setTimeout(async () => {
      const run = ++runRef.current;
      pageRef.current = 1;
      exhaustedRef.current = false;
      setLoading(true);
      try {
        const res = await searchProducts(trimmed, { ...params, page: 1 });
        if (run !== runRef.current) return;
        setItems(res.items);
        setTotal(res.total);
        setPriceRange(res.priceRange);
        exhaustedRef.current = res.items.length === 0 || res.items.length >= res.total;
      } catch {
        if (run !== runRef.current) return;
        setItems([]);
        setTotal(0);
        exhaustedRef.current = true;
      } finally {
        if (run === runRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, params]);

  const loadMore = useCallback(async () => {
    if (!trimmed || exhaustedRef.current || loading || loadingMore) return;
    const run = runRef.current;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const res = await searchProducts(trimmed, { ...params, page: next });
      if (run !== runRef.current) return;
      pageRef.current = next;
      setTotal(res.total);
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev, ...res.items.filter((p) => !seen.has(p.id))];
        exhaustedRef.current = res.items.length === 0 || merged.length >= res.total;
        return merged;
      });
    } catch {
      // leave `exhausted` alone so the next scroll retries
    } finally {
      if (run === runRef.current) setLoadingMore(false);
    }
  }, [trimmed, params, loading, loadingMore]);

  return { items, total, loading, loadingMore, loadMore, priceRange };
}



export function SearchScreen({ route, navigation }: Props) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const { query = '' } = route.params || {};
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const { addProduct } = useAddToCart();
  const { show } = useToast();
  const { recordSearch } = useSearchHistory();
  const { getProduct, reload } = useCatalog();

  const [searchQuery, setSearchQuery] = useState(query);
  const [filters, setFilters] = useState<FilterState>(defaultFilters());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const {
    items,
    total,
    loading: isLoading,
    loadingMore,
    loadMore,
    priceRange,
  } = useProductSearch(searchQuery, filters.sort, filters.inStockOnly, filters.minPrice, filters.maxPrice);

  // Stock is patched live into CatalogContext by the `stock.changed` socket;
  // overlay it so results stay current even though the rows came from /search.
  const searchedProducts = useMemo(
    () =>
      items.map((p) => {
        const live = getProduct(p.id);
        return live ? { ...p, variants: live.variants } : p;
      }),
    [items, getProduct],
  );

  const products = useMemo(() => applyFilters(searchedProducts, filters), [searchedProducts, filters]);

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          name="back"
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs', { screen: 'Home' }))}
          accessibilityLabel={t('common.back')}
        />
        <View style={styles.searchField}>
          <Icon name="search" size={21} color={colors.placeholder} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoFocus={!query}
            onSubmitEditing={() => recordSearch(searchQuery)}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.searchFilterButton}
          onPress={() => setSheetOpen(true)}
        >
          <Icon name="tune" size={23} color={colors.onPrimary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={[styles.skeletonGrid, { paddingBottom: 92 + insets.bottom }]}>
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
          contentContainerStyle={[styles.grid, { paddingBottom: 92 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
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
              onAction={() => {
                setFilters(defaultFilters());
                setSearchQuery('');
              }}
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
        subcategories={[]}
        priceRange={priceRange}
        resultCount={(draft) => applyFilters(searchedProducts, draft).length}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.gutter,
    paddingTop: 8,
    paddingBottom: spacing.lg,
  },
  searchField: {
    flex: 1,
    height: 52,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.bodyLg,
    fontWeight: weight.semibold,
    color: colors.ink,
  },
  searchFilterButton: {
    width: 52,
    height: 52,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.gutter, gap: spacing.sm },
  // Kept in step with CategoryListingScreen so search results and a category
  // listing read as the same page.
  grid: { paddingHorizontal: spacing.gutter, gap: spacing.lg, paddingTop: 2 },
  gridRow: { gap: spacing.lg },
  gridCell: { flex: 1, maxWidth: '50%' },
  skeletonGrid: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  skeletonCell: { width: '47%' },
  footerLoader: { paddingVertical: spacing.lg, alignItems: 'center' },
});
