 import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getHome, type Banner } from '../api/home';
import { CategoryImage } from '../components/CategoryImage';
import { Icon } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { ProductCard } from '../components/ProductCard';
import { Skeleton, SkeletonList, CategorySkeleton, ProductCardSkeleton } from '../components/Skeleton';
import { Screen, IconButton, SectionHeader, TextLink } from '../components/ui';
import { t as tr } from '../data/catalog';
import type { Category } from '../data/types';
import { defaultFilters, type FilterState, applyFilters } from '../data/filters';
import { FilterSheet } from './FilterSheet';
import { useAddToCart } from '../hooks/useAddToCart';
import { useLang } from '../hooks/useLang';
import { useGlassTabBarHeight } from '../navigation/GlassTabBar';
import type { RootNavigation } from '../navigation/types';
import { useAddresses } from '../store/AddressesContext';
import { useCatalog } from '../store/CatalogContext';
import { useSearchHistory } from '../store/SearchHistoryContext';
import { fontSize, radii, spacing, weight } from '../theme';
import { formatAmount, formatShortDate } from '../utils/format';
import { useTheme } from "../store/ConfigContext";

export function HomeScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors, theme), [colors, theme]);

  const { t, language } = useLang();
  const navigation = useNavigation<RootNavigation>();
  const { addProduct } = useAddToCart();
  const { categories, popularProducts, isLoading, reload } = useCatalog();
  const { addresses, primaryId } = useAddresses();
  const { history, recordSearch, clearHistory } = useSearchHistory();
  const tabBarHeight = useGlassTabBarHeight();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(defaultFilters());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(Dimensions.get('window').width - 52);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  useEffect(() => {
    getHome()
      .then((home) => setBanners(home.banners))
      .catch(() => undefined);
  }, []);

  const onAdScroll = useCallback((event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveAdIndex(Math.round(index));
  }, []);

  const openBanner = useCallback(
    (banner: Banner) => {
      if (banner.linkType === 'category' && banner.linkId) {
        navigation.navigate('CategoryListing', { categoryId: banner.linkId });
      } else if (banner.linkType === 'product' && banner.linkId) {
        navigation.navigate('ProductDetail', { productId: banner.linkId });
      }
    },
    [navigation],
  );

  const popular = useMemo(() => popularProducts(8), [popularProducts]);
  const primaryAddress = addresses.find((a) => a.id === primaryId);

  const popularFiltered = useMemo(() => {
    let result = popular;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => tr(p.name, language).toLowerCase().includes(q));
    }
    return applyFilters(result, filters);
  }, [popular, searchQuery, language, filters]);

  const runSearch = useCallback(() => {
    const query = searchQuery.trim();
    if (!query) return;
    recordSearch(query);
    navigation.navigate('Search', { query });
  }, [navigation, recordSearch, searchQuery]);

  const openCategory = useCallback(
    (category: Category) =>
      navigation.navigate('CategoryListing', { categoryId: category.id }),
    [navigation],
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
        // Without this the first tap after typing is swallowed to dismiss the
        // keyboard and never reaches the search button — you would have to tap
        // it twice. "handled" still dismisses on taps that hit no child.
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Address + notifications */}
        <View style={styles.topRow}>
          <Pressable 
            accessibilityRole="button" 
            style={styles.address}
            onPress={() => navigation.navigate('Addresses')}
          >
            <Icon name="location" size={22} color={colors.primary} />
            <View>
              <Text style={styles.addressLabel}>{t('home.deliverTo')}</Text>
              <View style={styles.addressValueRow}>
                <Text style={styles.addressValue} numberOfLines={1}>
                  {primaryAddress ? tr(primaryAddress.label, language) : t('home.noAddress')}
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
        <View style={styles.searchContainer}>
          <View style={styles.searchField}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('home.searchPlaceholder')}
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              onSubmitEditing={runSearch}
            />
            {/* Trailing affordance: the glyph doubles as the submit button, so
                the query can be sent without reaching for the keyboard. */}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('common.search')}
              haptic
              onPress={runSearch}
              style={styles.searchButton}
            >
              <Icon name="search" size={22} color={colors.onPrimary} style={styles.searchButtonIcon} />
            </PressableScale>
          </View>
          
          {/* Nothing to show until the customer has actually searched, so the
              rail collapses rather than reserving empty space. */}
          {history.length > 0 && (
            <View style={styles.searchHistoryRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                // Nested scroll views do not inherit it, and these pills sit
                // directly under the field the keyboard belongs to.
                keyboardShouldPersistTaps="handled"
                // Shrinks rather than grows, so Clear stays put beside the
                // pills instead of being pushed off the trailing edge once the
                // rail overflows.
                style={styles.searchHistoryScroll}
                contentContainerStyle={styles.searchHistoryRail}
              >
                {history.map((query) => (
                  <Pressable
                    key={query}
                    accessibilityRole="button"
                    onPress={() => setSearchQuery(query)}
                    style={styles.historyPill}
                  >
                    <Icon name="schedule" size={18} color={colors.inkMuted} />
                    <Text style={styles.historyPillText}>{query}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextLink
                label={t('common.clear')}
                onPress={clearHistory}
                style={styles.clearHistory}
              />
            </View>
          )}
        </View>

        {/* Categories */}
        <SectionHeader
          title={t('home.categories')}
          actionLabel={t('common.seeAll')}
          onAction={() => navigation.navigate('Tabs', { screen: 'Categories' })}
        />
        <View style={styles.categoryGrid}>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <View key={index} style={styles.categoryItem}>
                <CategorySkeleton />
              </View>
            ))
          ) : (
            categories.map((category, index) => (
              <FadeSlideIn key={category.id} index={index} style={styles.categoryItem}>
                <PressableScale
                  accessibilityRole="button"
                  onPress={() => openCategory(category)}
                  style={styles.categoryPress}
                >
                  <CategoryImage uri={category.imageUrl} icon={category.icon} />
                  <Text style={styles.categoryLabel} numberOfLines={2}>
                    {tr(category.name, language)}
                  </Text>
                </PressableScale>
              </FadeSlideIn>
            ))
          )}
        </View>

        {/* Merchandising banners (CMS-managed, §4.18) */}
        {banners.length > 0 && (
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
                {banners.map((banner) => (
                  <AdSlide
                    key={banner.id}
                    uri={banner.imageUrl}
                    width={sliderWidth}
                    onPress={() => openBanner(banner)}
                  />
                ))}
              </ScrollView>
            </View>
            {banners.length > 1 && (
              <View style={styles.paginationRow}>
                {banners.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === activeAdIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Popular rail */}
        <SectionHeader
          title={t('home.popular')}
          actionLabel={t('common.seeAll')}
          onAction={() => navigation.navigate('Tabs', { screen: 'Categories' })}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.rail}
        >
          {isLoading ? (
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </View>
          ) : (
            popularFiltered.map((product, index) => (
              <FadeSlideIn key={product.id} index={index}>
                <ProductCard
                  product={product}
                  onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
                  onAdd={() => addProduct(product)}
                />
              </FadeSlideIn>
            ))
          )}
        </ScrollView>
      </ScrollView>

      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        subcategories={[]}
        resultCount={(draft) => applyFilters(popular, draft).length}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
      />
    </Screen>
  );
}

/** Banners are remote, so each slide holds a placeholder until its image lands. */
function AdSlide({ uri, width, onPress }: { uri: string; width: number; onPress: () => void }) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors, theme), [colors]);

  const [pending, setPending] = useState(true);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.adImage, { width }]}>
      <Image
        source={{ uri }}
        style={styles.adImage}
        resizeMode="cover"
        onLoadEnd={() => setPending(false)}
      />
      {pending && <Skeleton style={StyleSheet.absoluteFill} height={undefined} radius={0} />}
    </Pressable>
  );
}

const makeStyles = (colors: any, theme: any) => StyleSheet.create({
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
  searchContainer: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  searchField: {
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    // Asymmetric: the text keeps the full gutter, while the trailing button sits
    // on a 6px inset so it reads as inlaid in the field rather than floating.
    paddingStart: spacing.lg,
    paddingEnd: 6,
    ...theme.shadow.card,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: weight.semibold,
    color: colors.ink,
  },
  searchButton: {
    // 42 matches `IconButton` and leaves an even 6px inset on the top, bottom
    // and trailing edge (56 field − 2 borders − 42 = 12, split evenly), so the
    // tile sits dead centre in the field's vertical run.
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.primaryCta,
    // The field already carries `theme.shadow.card`; a full-strength CTA glow on top
    // of it muddies the edge, so the brand glow is dialled back here.
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchButtonIcon: {
    // The flex box above centres the glyph's *Text box*; these centre the glyph
    // within that box. Android otherwise hangs an icon font off the baseline
    // with extra font padding, which reads as a few pixels low.
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  searchHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  searchHistoryScroll: { flexShrink: 1 },
  searchHistoryRail: {
    gap: spacing.sm,
  },
  clearHistory: {
    // Muted rather than the link green: clearing is a secondary, mildly
    // destructive action and should not compete with the pills for attention.
    color: colors.inkMuted,
  },
  historyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    gap: 6,
  },
  historyPillText: {
    fontSize: fontSize.body,
    fontWeight: weight.bold,
    color: colors.inkMuted,
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
