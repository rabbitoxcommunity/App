import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CategoryImage } from '../components/CategoryImage';
import { Icon } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { ProductCard } from '../components/ProductCard';
import { useToast } from '../components/Toast';
import { Screen, IconButton, SectionHeader } from '../components/ui';
import { popularProducts, t as tr } from '../data/catalog';
import { CATEGORIES, DEFAULT_ADDRESS, LAST_BASKET } from '../data/mock';
import type { Category } from '../data/types';
import { defaultFilters, type FilterState, applyFilters } from '../data/filters';
import { FilterSheet } from './FilterSheet';
import { useAddToCart } from '../hooks/useAddToCart';
import { useLang } from '../hooks/useLang';
import type { RootNavigation } from '../navigation/types';
import { useCart } from '../store/CartContext';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { formatAmount, formatShortDate } from '../utils/format';

const POPULAR = popularProducts(8);

const ADS = [
  { id: '1', image: 'https://picsum.photos/seed/ad1/800/300' },
  { id: '2', image: 'https://picsum.photos/seed/ad2/800/300' },
  { id: '3', image: 'https://picsum.photos/seed/ad3/800/300' },
];

export function HomeScreen() {
  const { t, language } = useLang();
  const navigation = useNavigation<RootNavigation>();
  const { addProduct } = useAddToCart();
  const { addItem } = useCart();
  const { show } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(defaultFilters());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(Dimensions.get('window').width - 52);

  const onAdScroll = useCallback((event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveAdIndex(Math.round(index));
  }, []);

  const popularFiltered = useMemo(() => {
    let result = POPULAR;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => tr(p.name, language).toLowerCase().includes(q));
    }
    return applyFilters(result, filters);
  }, [searchQuery, language, filters]);

  const openCategory = useCallback(
    (category: Category) =>
      navigation.navigate('CategoryListing', { categoryId: category.id }),
    [navigation],
  );

  const reorder = useCallback(() => {
    LAST_BASKET.lines.forEach((line) =>
      addItem(line.productId, line.variantId, line.quantity),
    );
    show({
      title: t('toast.addedToCart'),
      body: t('home.reorderTitle'),
      action: {
        label: t('common.view'),
        onPress: () => navigation.navigate('Tabs', { screen: 'Cart' }),
      },
    });
  }, [addItem, navigation, show, t]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Address + notifications */}
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" style={styles.address}>
            <Icon name="location" size={22} color={colors.primary} />
            <View>
              <Text style={styles.addressLabel}>{t('home.deliverTo')}</Text>
              <View style={styles.addressValueRow}>
                <Text style={styles.addressValue} numberOfLines={1}>
                  {tr(DEFAULT_ADDRESS.label, language)}
                </Text>
                <Icon name="expand" size={18} color={colors.inkMuted} />
              </View>
            </View>
          </Pressable>
          <IconButton
            name="notifications"
            accessibilityLabel={t('home.deliverTo')}
            badge
          />
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
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
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  navigation.navigate('Search', { query: searchQuery });
                }
              }}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('listing.filters')}
            style={styles.searchFilterButton}
            onPress={() => setSheetOpen(true)}
          >
            <Icon name="tune" size={23} color={colors.onPrimary} />
          </Pressable>
        </View>

        {/* Categories */}
        <SectionHeader
          title={t('home.categories')}
          actionLabel={t('common.seeAll')}
          onAction={() => navigation.navigate('Tabs', { screen: 'Categories' })}
        />
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((category, index) => (
            <FadeSlideIn key={category.id} index={index} style={styles.categoryItem}>
              <PressableScale
                accessibilityRole="button"
                onPress={() => openCategory(category)}
                style={styles.categoryPress}
              >
                <CategoryImage source={category.image} icon={category.icon} />
                <Text style={styles.categoryLabel} numberOfLines={2}>
                  {tr(category.name, language)}
                </Text>
              </PressableScale>
            </FadeSlideIn>
          ))}
        </View>

        {/* Supermarket Ads Slider */}
        <View style={styles.adSection}>
          <View 
            style={styles.adContainer}
            onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
          >
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.adSlider}
              onScroll={onAdScroll}
              scrollEventThrottle={16}
            >
              {ADS.map((ad) => (
                <Image
                  key={ad.id}
                  source={{ uri: ad.image }}
                  style={[styles.adImage, { width: sliderWidth }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
          <View style={styles.paginationRow}>
            {ADS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === activeAdIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Popular rail */}
        <SectionHeader
          title={t('home.popular')}
          actionLabel={t('common.seeAll')}
          onAction={() => navigation.navigate('Tabs', { screen: 'Categories' })}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {popularFiltered.map((product, index) => (
            <FadeSlideIn key={product.id} index={index}>
            <ProductCard
              product={product}
              onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              onAdd={() => addProduct(product)}
            />
            </FadeSlideIn>
          ))}
        </ScrollView>
      </ScrollView>

      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        subcategories={[]}
        resultCount={(draft) => applyFilters(POPULAR, draft).length}
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
  content: { paddingHorizontal: spacing.gutter, paddingTop: 6, paddingBottom: 32 },
  pressed: { opacity: 0.8 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  address: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  addressLabel: {
    fontSize: fontSize.tiny,
    fontWeight: weight.bold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.placeholder,
  },
  addressValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  addressValue: {
    flexShrink: 1,
    fontSize: fontSize.bodyLg,
    fontWeight: weight.heavy,
    color: colors.ink,
  },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.xl },
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  categoryItem: { width: '25%', paddingHorizontal: 5 },
  categoryPress: { alignItems: 'center', gap: 7 },
  categoryLabel: {
    fontSize: fontSize.tiny,
    fontWeight: weight.bold,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 14,
  },
  adSection: {
    marginBottom: spacing['2xl'],
  },
  adContainer: {
    borderRadius: radii['2xl'],
    overflow: 'hidden',
    height: 90,
  },
  adSlider: {
    flex: 1,
  },
  adImage: {
    height: '100%',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  paginationDotActive: {
    backgroundColor: colors.primary,
    width: 14,
  },
  rail: { gap: 14, paddingEnd: spacing.gutter },
});
