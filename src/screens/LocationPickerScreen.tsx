import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Alert, TextInput, Keyboard, FlatList, TouchableOpacity } from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { PrimaryButton, AppHeader } from '../components/ui';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { colors, fontSize, radii, spacing, weight } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationPicker'>;

const DEFAULT_REGION = {
  latitude: 25.2048,
  longitude: 55.2708, // Dubai default
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type Suggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export function LocationPickerScreen({ navigation, route }: Props) {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLoadingLocation(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        mapRef.current?.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (error) {
        // Fallback to default region if location fails
        console.warn('Failed to get location', error);
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const handleConfirmLocation = async () => {
    setSaving(true);
    try {
      let labelStr = 'Map Location';
      let linesStr = 'Selected from map';

      if (searchQuery.trim().length > 0) {
        // If the user used the search (and didn't drag away), use the exact text
        const parts = searchQuery.split(',').map(s => s.trim());
        labelStr = parts[0];
        linesStr = parts.slice(1).join(', ') || parts[0];
      } else {
        // Reverse geocode to get a readable address if they manually placed the pin
        const geocoded = await Location.reverseGeocodeAsync({
          latitude: region.latitude,
          longitude: region.longitude,
        });

        const first = geocoded[0];
        labelStr = first?.name || first?.street || 'Map Location';
        linesStr = [first?.street, first?.city, first?.region, first?.country].filter(Boolean).join(', ') || 'Selected from map';
      }

      route.params.onLocationPicked({ 
        latitude: region.latitude, 
        longitude: region.longitude,
        label: labelStr,
        lines: linesStr 
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save location address');
    } finally {
      setSaving(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5`,
          { headers: { 'User-Agent': 'DeliveryApp/1.0' } }
        );
        const data = await res.json();
        setSuggestions(data);
      } catch (e) {
        console.warn('Failed to fetch suggestions', e);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const handleSelectSuggestion = (item: Suggestion) => {
    Keyboard.dismiss();
    setSearchQuery(item.display_name);
    setSuggestions([]);
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    const newRegion = { latitude: lat, longitude: lon, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 4 }]}>
        <AppHeader
          title={t('checkout.deliveryAddress')}
          onBack={navigation.goBack}
          backLabel={t('common.back')}
          align="start"
          trailing={null}
        />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={(newRegion, details) => {
            setRegion(newRegion);
            if (details?.isGesture) {
              // User manually dragged the map, so clear the specific search text 
              // to fallback to reverse geocoding for the new pin location.
              setSearchQuery('');
              setSuggestions([]);
            }
          }}
          showsUserLocation
          showsMyLocationButton
        />
        
        {/* Floating Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={colors.inkMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search location..."
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.place_id.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item)}
                  >
                    <Icon name="location" size={16} color={colors.textSecondary} />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Center Pin Marker */}
        <View style={styles.pinContainer} pointerEvents="none">
          {/* Replace location-pin with map-pin or just use a generic dot if map-pin is not found. Let's use map-pin or location */}
          <View style={styles.pinDot} />
        </View>

        {loadingLocation && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <PrimaryButton
          label={saving ? "Saving..." : "Confirm Location"}
          onPress={handleConfirmLocation}
          disabled={saving}
          height={56}
          labelSize={fontSize.base}
          style={styles.confirmButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerContainer: {
    paddingHorizontal: spacing.gutter,
    backgroundColor: colors.surface,
    zIndex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchWrapper: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.gutter,
    right: spacing.gutter,
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: fontSize.body,
    fontWeight: weight.semibold,
    color: colors.ink,
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: fontSize.small,
    color: colors.ink,
    lineHeight: 20,
  },
  pinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10, // Half of dot width
    marginTop: -10, // Half of dot height
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  confirmButton: {
    width: '100%',
  },
});
