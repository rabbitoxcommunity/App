import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { listShops, type Shop } from '../api/tenants';
import { Icon } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { PrimaryButton, Screen } from '../components/ui';
import { useLang } from '../hooks/useLang';
import { useTenant } from '../store/TenantContext';
import { useTheme } from '../store/ConfigContext';
import { fontSize, radii, spacing, weight } from '../theme';
import { distanceKm, formatDistance, type LatLng } from '../utils/geo';

type ShopWithDistance = Shop & { distanceKm: number | null };

/**
 * Rendered by TenantGate (App.tsx) before AuthProvider/ConfigProvider ever
 * mount — this app is shared across every shop on the platform, so which
 * tenant you're even talking to has to be resolved here first. `useTheme()`
 * falls back to the base palette outside ConfigProvider, same as SplashScreen.
 */
export function ShopPickerScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { t, language } = useLang();
  const { chooseTenant } = useTenant();

  const [shops, setShops] = useState<Shop[] | null>(null);
  const [error, setError] = useState(false);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const load = useCallback(() => {
    setError(false);
    setShops(null);
    listShops()
      .then(setShops)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Same auto-request-on-mount pattern as LocationPickerScreen — a denial or
  // failure just means the list stays in its default order, never blocks it.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // Nearest-first is a nice-to-have, not a requirement to use the picker.
      }
    })();
  }, []);

  const rows = useMemo<ShopWithDistance[]>(() => {
    const withDistance = (shops ?? []).map((shop) => ({
      ...shop,
      distanceKm: coords && shop.geo ? distanceKm(coords, shop.geo) : null,
    }));
    const filtered = query.trim()
      ? withDistance.filter((s) => s.storeName.en.toLowerCase().includes(query.trim().toLowerCase()))
      : withDistance;
    return [...filtered].sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [shops, coords, query]);

  const pick = async (shop: Shop) => {
    setChoosing(shop.id);
    await chooseTenant(shop);
    // No manual navigation — TenantGate re-renders past this screen as soon
    // as the context updates.
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Icon name="leaf" size={40} color={colors.onPrimary} />
        </View>
        <Text style={styles.title}>{t('shopPicker.title')}</Text>
        <Text style={styles.subtitle}>{t('shopPicker.subtitle')}</Text>
      </View>

      {shops !== null && !error && shops.length > 0 && (
        <View style={styles.searchField}>
          <Icon name="search" size={20} color={colors.placeholder} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('shopPicker.searchPlaceholder')}
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      )}

      {error ? (
        <View style={styles.centerState}>
          <Icon name="offline" size={40} color={colors.textTertiary} />
          <Text style={styles.stateText}>{t('shopPicker.loadError')}</Text>
          <PrimaryButton label={t('shopPicker.retry')} onPress={load} iconStart="replay" height={52} />
        </View>
      ) : shops === null ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : shops.length === 0 ? (
        <View style={styles.centerState}>
          <Icon name="storefront" size={40} color={colors.textTertiary} />
          <Text style={styles.stateText}>{t('shopPicker.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(shop) => shop.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Icon name="search" size={40} color={colors.textTertiary} />
              <Text style={styles.stateText}>{t('shopPicker.noResults', { query })}</Text>
            </View>
          }
          renderItem={({ item: shop, index }) => (
            <FadeSlideIn index={index}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={shop.storeName.en}
                onPress={() => pick(shop)}
                disabled={choosing !== null}
                style={styles.card}
              >
                <View style={styles.thumb}>
                  {shop.logoUrl ? (
                    <Image source={{ uri: shop.logoUrl }} style={styles.thumbImage} />
                  ) : (
                    <Icon name="storefront" size={26} color={colors.primary} />
                  )}
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {shop.storeName.en}
                  </Text>
                  <Text style={styles.cardAddress} numberOfLines={1}>
                    {shop.distanceKm != null
                      ? formatDistance(shop.distanceKm, language)
                      : (shop.address?.en ?? '')}
                  </Text>
                </View>
                {choosing === shop.id ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Icon name="chevron" size={22} color={colors.disabledSoft} />
                )}
              </PressableScale>
            </FadeSlideIn>
          )}
        />
      )}
    </Screen>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    header: { alignItems: 'center', gap: 10, paddingTop: spacing.xl, paddingBottom: 20, paddingHorizontal: 26 },
    logo: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    title: { fontSize: fontSize['3xl'], fontWeight: weight.heavy, color: colors.ink, textAlign: 'center' },
    subtitle: { fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', maxWidth: 280 },

    searchField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 52,
      marginHorizontal: 26,
      marginBottom: 14,
      borderRadius: radii.xl,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.lg,
    },
    searchInput: { flex: 1, fontSize: fontSize.bodyLg, fontWeight: weight.semibold, color: colors.ink },

    list: { paddingHorizontal: 26, paddingBottom: 32, gap: 10, flexGrow: 1 },

    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 1.5,
      borderColor: colors.borderLight,
      borderRadius: radii['3xl'],
      padding: 14,
      marginBottom: 10,
    },
    thumb: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    thumbImage: { width: '100%', height: '100%' },
    cardText: { flex: 1, minWidth: 0 },
    cardName: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.ink },
    cardAddress: { fontSize: fontSize.small, fontWeight: weight.semibold, color: colors.textSecondary, marginTop: 2 },

    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 60 },
    stateText: { fontSize: fontSize.body, fontWeight: weight.semibold, color: colors.textSecondary, textAlign: 'center', maxWidth: 260 },
  });
