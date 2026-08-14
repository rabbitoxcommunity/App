import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { CategoryListingScreen } from '../screens/CategoryListingScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MyCreditScreen } from '../screens/MyCreditScreen';
import { OrderPlacedScreen } from '../screens/OrderPlacedScreen';
import { OrderTrackingScreen } from '../screens/OrderTrackingScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { ToastGalleryScreen } from '../screens/ToastGalleryScreen';
import { LocationPickerScreen } from '../screens/LocationPickerScreen';
import { AddressesScreen } from '../screens/AddressesScreen';
import { useAuth } from '../store/AuthContext';
import { colors } from '../theme';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.surface,
    card: colors.surface,
    text: colors.ink,
    border: colors.borderLight,
  },
};

export function RootNavigator() {
  const { session } = useAuth();

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // Push transitions mirror automatically under RTL.
          animation: 'slide_from_right',
          animationDuration: 260,
          gestureEnabled: true,
        }}
      >
        {session ? (
          <Stack.Group>
            <Stack.Screen name="Tabs" component={TabNavigator} options={{ animation: 'fade' }} />
            <Stack.Screen name="CategoryListing" component={CategoryListingScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen
              name="OrderPlaced"
              component={OrderPlacedScreen}
              // The order exists now: swiping back to a checkout that already
              // submitted would be wrong, so the gesture is off here.
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen
              name="OrderTracking"
              component={OrderTrackingScreen}
              // Coming from checkout this is a completion, not a push.
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="MyCredit" component={MyCreditScreen} />
            <Stack.Screen name="ToastGallery" component={ToastGalleryScreen} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
            <Stack.Screen name="Addresses" component={AddressesScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Legal" component={LegalScreen} options={{ presentation: 'modal' }} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
