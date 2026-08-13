import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Dimensions, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { CategoryImage } from '../components/CategoryImage';
import { Screen, IconButton } from '../components/ui';
import { t as tr } from '../data/catalog';
import { useLang } from '../hooks/useLang';
import { useGlassTabBarHeight } from '../navigation/GlassTabBar';
import type { RootNavigation } from '../navigation/types';
import { useCatalog } from '../store/CatalogContext';
import { colors, fontSize, radii, spacing, weight } from '../theme';

/** The "Categories" tab: the full aisle list, with a live product count per tile. */
export function CategoriesScreen() {
  const { t, language } = useLang();
  const navigation = useNavigation<RootNavigation>();
  const tabBarHeight = useGlassTabBarHeight();
  const { categories, productsInCategory, reload } = useCatalog();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  return (
    <Screen>
      <FlatList
        data={categories}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('home.categories')}</Text>
            <IconButton 
              name="search" 
              accessibilityLabel={t('common.search')} 
              onPress={() => navigation.navigate('Search', { query: '' })}
            />
          </View>
        }
        renderItem={({ item }) => {
          const count = productsInCategory(item.id).length;
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('CategoryListing', { categoryId: item.id })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.imageContainer}>
                <CategoryImage uri={item.imageUrl} icon={item.icon} radius={0} style={styles.cardImage} />
              </View>
              <Text style={styles.name} numberOfLines={2}>
                {tr(item.name, language)}
              </Text>
              <Text style={styles.count}>{t('listing.itemCount', { count })}</Text>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const CARD_WIDTH = (Dimensions.get('window').width - 52 - 28) / 3;

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.gutter, paddingTop: 6, paddingBottom: 32 },
  column: { gap: 14, marginBottom: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: weight.heavy,
    color: colors.ink,
  },
  card: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  pressed: { opacity: 0.8 },
  name: { 
    fontSize: fontSize.small, 
    fontWeight: weight.bold, 
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 16,
  },
  count: {
    fontSize: fontSize.tiny,
    fontWeight: weight.semibold,
    color: colors.placeholder,
    textAlign: 'center',
    marginTop: 2,
  },
});
