import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { requestStockNotification } from '../api/notifications';
import { CartPeekBar } from '../components/CartPeekBar';
import { Icon } from '../components/Icon';
import { FadeSlideIn } from '../components/motion';
import { ProductRow } from '../components/ProductRow';
import { useToast } from '../components/Toast';
import { EmptyState, IconButton, Screen } from '../components/ui';
import { defaultVariant, t as tr } from '../data/catalog';
import { applyFilters, defaultFilters, type FilterState } from '../data/filters';
import { useAddToCart } from '../hooks/useAddToCart';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { useCatalog } from '../store/CatalogContext';
import { useSearchHistory } from '../store/SearchHistoryContext';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { FilterSheet } from './FilterSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

export function SearchScreen({ route, navigation }: Props) {
  const { query = '' } = route.params || {};
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const { addProduct } = useAddToCart();
  const { show } = useToast();
  const { recordSearch } = useSearchHistory();
  const { products: catalogProducts } = useCatalog();

  const [searchQuery, setSearchQuery] = useState(query);
  const [filters, setFilters] = useState<FilterState>(defaultFilters());
  const [sheetOpen, setSheetOpen] = useState(false);

  const searchedProducts = useMemo(() => {
    let result = catalogProducts;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => tr(p.name, language).toLowerCase().includes(q));
    }
    return result;
  }, [catalogProducts, searchQuery, language]);

  const products = useMemo(() => applyFilters(searchedProducts, filters), [searchedProducts, filters]);

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton name="back" onPress={() => navigation.goBack()} accessibilityLabel={t('common.back')} />
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

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 92 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
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
            onAction={() => {
              setFilters(defaultFilters());
              setSearchQuery('');
            }}
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
        subcategories={[]}
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

const styles = StyleSheet.create({
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
});
