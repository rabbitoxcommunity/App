import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen, IconButton } from '../components/ui';
import { productsInCategory, t as tr } from '../data/catalog';
import { CATEGORIES } from '../data/mock';
import { useLang } from '../hooks/useLang';
import type { RootNavigation } from '../navigation/types';
import { colors, fontSize, radii, spacing, weight } from '../theme';

/**
 * The "Categories" tab: the full aisle list. Item counts come from the mock
 * catalogue so they stay honest as products are added.
 */
export function CategoriesScreen() {
  const { t, language } = useLang();
  const navigation = useNavigation<RootNavigation>();

  /**
   * Held in state rather than read straight from the module so pull-to-refresh
   * has something to re-read. Today that source is `mock.ts`; when the
   * catalogue moves behind `src/api`, only `onRefresh` changes.
   */
  const [categories, setCategories] = useState(CATEGORIES);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // The floor keeps the spinner on screen long enough to read; without it a
      // synchronous re-read kills it inside a frame and the pull looks broken.
      await new Promise((r) => setTimeout(r, 450));
      setCategories([...CATEGORIES]);
    } finally {
      setRefreshing(false);
    }
  }, []);

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
        contentContainerStyle={styles.content}
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
                <Image source={item.image} style={styles.cardImage} resizeMode="cover" />
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
