 import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CategoryImage } from '../components/CategoryImage';
import { Icon } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { Screen, IconButton, SectionHeader, TextLink } from '../components/ui';
import { popularProducts, t as tr } from '../data/catalog';
import { CATEGORIES, DEFAULT_ADDRESS, LAST_BASKET } from '../data/mock';
import type { Category } from '../data/types';
import { defaultFilters, type FilterState, applyFilters } from '../data/filters';
import { FilterSheet } from './FilterSheet';
import { useAddToCart } from '../hooks/useAddToCart';
import { useLang } from '../hooks/useLang';
import { useGlassTabBarHeight } from '../navigation/GlassTabBar';
import type { RootNavigation } from '../navigation/types';
import { useCart } from '../store/CartContext';
import { useSearchHistory } from '../store/SearchHistoryContext';
import { colors, fontSize, radii, shadow, spacing, weight } from '../theme';
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
  const { history, recordSearch, clearHistory } = useSearchHistory();
  const tabBarHeight = useGlassTabBarHeight();

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
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
        // Without this the first tap after typing is swallowed to dismiss the
        // keyboard and never reaches the search button — you would have to tap
        // it twice. "handled" still dismisses on taps that hit no child.
        keyboardShouldPersistTaps="handled"
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
                <AdSlide key={ad.id} uri={ad.image} width={sliderWidth} />
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
          keyboardShouldPersistTaps="handled"
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

/** Banners are remote, so each slide holds a placeholder until its image lands. */
function AdSlide({ uri, width }: { uri: string; width: number }) {
  const [pending, setPending] = useState(true);
  return (
    <View style={[styles.adImage, { width }]}>
      <Image
        source={{ uri }}
        style={styles.adImage}
        resizeMode="cover"
        onLoadEnd={() => setPending(false)}
      />
      {pending && <Skeleton style={StyleSheet.absoluteFill} height={undefined} radius={0} />}
    </View>
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
    ...shadow.card,
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
    ...shadow.primaryCta,
    // The field already carries `shadow.card`; a full-strength CTA glow on top
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
